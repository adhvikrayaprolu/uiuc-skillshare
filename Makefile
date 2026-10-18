.PHONY: dev check setup native-check native-dev stop logs browser-check
dev:
	docker compose up --build --wait
check:
	docker compose up --build --wait
	docker compose exec -T app python manage.py check
	docker compose exec -T app python manage.py makemigrations --check --dry-run
	docker compose exec -T app python manage.py test --settings=skillswap_backend.test_settings --noinput
	docker compose --profile checks run --build --rm frontend-check
	$(MAKE) browser-check
stop:
	docker compose down
logs:
	docker compose logs -f app worker
setup:
	python3 scripts/setup.py
native-dev:
	backend/.venv/bin/python scripts/dev.py
native-check:
	backend/.venv/bin/python scripts/check.py

browser-check:
	docker compose exec -T app python manage.py cleanup_e2e
	docker compose exec -T app python manage.py seed_e2e
	docker compose --profile checks run --no-deps --build --rm browser-check; result=$$?; docker compose exec -T app python manage.py cleanup_e2e; exit $$result
