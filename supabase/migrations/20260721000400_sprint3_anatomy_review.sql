-- Sprint 3 anatomy review seed. This is intentionally clinician-review, not approved.
insert into clinical.anatomy_map_versions (version_number, status, definition)
values (1, 'clinician_review', '{"body_views":["anterior","posterior","foot_dorsal","foot_plantar"],"source":"Ekagra predefined MVP zones"}'::jsonb)
on conflict (version_number) do nothing;
