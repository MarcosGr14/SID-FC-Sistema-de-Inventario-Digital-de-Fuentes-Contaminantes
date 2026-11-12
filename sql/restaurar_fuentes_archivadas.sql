-- Ejecutar como administrador para devolver las fuentes archivadas al inventario.
update public.fuentes set archivado_en = null where archivado_en is not null;
