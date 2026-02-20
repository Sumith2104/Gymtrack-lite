-- This script adds the 'formatted_gym_id' column to the 'messages' table.
-- This column will store the human-readable ID of the gym (e.g., "STEELFIT123")
-- for easier querying and to align with the changes made in the application logic.

ALTER TABLE public.messages
ADD COLUMN formatted_gym_id TEXT;

-- After running this ALTER statement, you may want to back-populate the
-- 'formatted_gym_id' for existing messages if you have any.
-- You can do this by running an UPDATE query, for example:
--
-- UPDATE public.messages m
-- SET formatted_gym_id = g.formatted_gym_id
-- FROM public.gyms g
-- WHERE m.gym_id = g.id AND m.formatted_gym_id IS NULL;
--
-- Run the above UPDATE statement with caution and after backing up your data.
