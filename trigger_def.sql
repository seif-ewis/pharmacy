
        BEGIN
            -- Allow transitioning to 'returned' status
            IF NEW.status = 'returned' THEN
                RETURN NEW;
            END IF;

            IF OLD.status = 'completed' OR OLD.status = 'delivered' THEN
                RAISE EXCEPTION 'Cannot modify order after completion. Order ID: %, Status: %', 
                    OLD.id, OLD.status
                USING ERRCODE = '23505';
            END IF;
            RETURN NEW;
        END;
        