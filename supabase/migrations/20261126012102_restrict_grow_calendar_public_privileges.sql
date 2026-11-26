revoke all privileges on public.grow_calendar_crops from anon, authenticated;
grant select on public.grow_calendar_crops to anon, authenticated;

alter table public.grow_calendar_crops add constraint grow_calendar_verified_content_guard check (
  not is_published or (
    jsonb_typeof(source_refs) = 'array' and jsonb_array_length(source_refs) > 0
    and nullif(trim(cultivation_note_de), '') is not null
    and nullif(trim(cultivation_note_en), '') is not null
    and timing ?& array['start_indoor','sow_outdoors','transplant_outdoors','harvest_or_flowering','harvest_kind']
    and timing->>'harvest_kind' in ('harvest','flowering')
  )
);
