-- Module: Admin verification enhancements.
-- Adds a reason column so flagging an account is auditable instead of a
-- silent status flip — the admin's own explanation is stored alongside it.
-- Resetting a profile back to 'active' (undo/re-review) clears this so a
-- stale reason from a previous flag doesn't linger.

alter table profiles add column if not exists flag_reason text;
