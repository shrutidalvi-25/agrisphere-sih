-- Module 10: voice-note translation support.
--
-- CreateLot.jsx already captured voice input as a raw transcript in the
-- farmer's own language (Marathi/Hindi) and just appended it straight into
-- `notes` — no translation happened. These two columns let lotService.js
-- keep the farmer's own words (what they can read back and verify) while
-- storing an English translation in `notes` itself, since buyers/FPOs
-- browsing lots may not read the farmer's language.
--
-- No new table for FPO incentive badges — tiers are computed on the fly
-- from the existing pooled_lots/pooled_lot_members data, since it's fully
-- derivable and doesn't need to be stored.
alter table lots add column if not exists notes_original text;
alter table lots add column if not exists notes_language text; -- 'mr' | 'hi' — null when the farmer's notes were already in English
