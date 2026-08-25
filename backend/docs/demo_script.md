# Demo Script

1. Setup:
   ```bash
   python manage.py migrate
   python manage.py seed_demo_data
   python manage.py rebuild_search_index
   python manage.py runserver
   ```

2. Log in through the frontend Google flow, or create a local superuser for admin review.

3. Call `GET /api/bootstrap/` after login to route the user.

4. Create or inspect a profile. Add at least three skills, one contact method, availability, and a credential.

5. Try discovery searches:
   - `figma`
   - `resume`
   - `startup`
   - `research`
   - `data`
   - `git`
   - `international`

6. Open a public profile and point out:
   - top skills
   - public contact methods only
   - public credentials only
   - reviews preview
   - endorsements
   - similar profiles

7. Save a profile.

8. Create a help request.

9. As the helper, accept the help request with a response message.

10. Click a contact method and confirm analytics records the event in Django admin.
