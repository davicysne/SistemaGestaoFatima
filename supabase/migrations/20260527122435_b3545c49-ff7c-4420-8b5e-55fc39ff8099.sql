
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'confeiteiro', 'boleiro');
CREATE TYPE public.order_status AS ENUM ('agendado', 'em_producao', 'finalizado', 'entregue', 'cancelado');
CREATE TYPE public.payment_status AS ENUM ('pago', 'pendente');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Clients
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients viewable" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update clients" ON public.clients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins delete clients" ON public.clients FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL UNIQUE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  vendor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_date DATE NOT NULL,
  order_time TIME NOT NULL,
  value NUMERIC(10,2) NOT NULL DEFAULT 0,
  info TEXT,
  flavor TEXT,
  filling TEXT,
  image_url TEXT,
  status public.order_status NOT NULL DEFAULT 'agendado',
  payment_status public.payment_status NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Orders viewable by auth" ON public.orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage orders insert" ON public.orders FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins or assignees update orders" ON public.orders FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR assigned_to = auth.uid() OR public.has_role(auth.uid(), 'boleiro')
);
CREATE POLICY "Admins delete orders" ON public.orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Order status history
CREATE TABLE public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_status public.order_status,
  to_status public.order_status NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_status_history TO authenticated;
GRANT ALL ON public.order_status_history TO service_role;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "History viewable" ON public.order_status_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "History insert auth" ON public.order_status_history FOR INSERT TO authenticated WITH CHECK (true);

-- Financial entries
CREATE TABLE public.financial_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  value NUMERIC(10,2) NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'pendente',
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.financial_entries TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.financial_entries TO authenticated;
GRANT ALL ON public.financial_entries TO service_role;
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fin viewable admin" ON public.financial_entries FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Fin manage admin" ON public.financial_entries FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger: auto-create profile + default boleiro role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER touch_orders BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_clients BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_fin BEFORE UPDATE ON public.financial_entries FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Trigger: log status change + sync financial entry
CREATE OR REPLACE FUNCTION public.handle_order_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_status_history(order_id, from_status, to_status, changed_by)
      VALUES (NEW.id, NULL, NEW.status, auth.uid());
    INSERT INTO public.financial_entries(order_id, value, status, entry_date, description)
      VALUES (NEW.id, NEW.value, NEW.payment_status, NEW.order_date, 'Pedido #' || NEW.order_number);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.order_status_history(order_id, from_status, to_status, changed_by)
        VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
    END IF;
    IF OLD.value IS DISTINCT FROM NEW.value OR OLD.payment_status IS DISTINCT FROM NEW.payment_status OR OLD.order_date IS DISTINCT FROM NEW.order_date THEN
      UPDATE public.financial_entries
        SET value = NEW.value, status = NEW.payment_status, entry_date = NEW.order_date
        WHERE order_id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER orders_change AFTER INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.handle_order_change();

-- Storage bucket for cake images
INSERT INTO storage.buckets (id, name, public) VALUES ('cake-images', 'cake-images', true) ON CONFLICT DO NOTHING;
CREATE POLICY "Cake images public read" ON storage.objects FOR SELECT USING (bucket_id = 'cake-images');
CREATE POLICY "Auth upload cake images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'cake-images');
CREATE POLICY "Auth update own cake images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'cake-images' AND owner = auth.uid());
CREATE POLICY "Auth delete own cake images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'cake-images' AND owner = auth.uid());
