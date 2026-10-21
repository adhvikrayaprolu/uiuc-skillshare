.PHONY: setup dev stop logs reset-demo smoke screenshots check check-down browser-check native-setup native-dev native-check

# Checks run in their own Compose project with demo data off, so they never touch the dev database.
CHECK_ENV = COMPOSE_PROJECT_NAME=skillshare-check DEMO_MODE=false APP_PORT=8180 MAIL_PORT=8125

setup:
	python3 scripts/setup.py
dev:
	python3 scripts/setup.py --env-only
	docker compose up --build --wait
	@echo ""
	@echo "Illini SkillShare is running:"
	@echo "  App          http://localhost:$${APP_PORT:-8080}  (click \"Try the demo\")"
	@echo "  Test inbox   http://localhost:$${MAIL_PORT:-8025}"
	@echo "  API docs     http://localhost:$${APP_PORT:-8080}/api/docs/"
	@echo "Stop with: make stop"
stop:
	docker compose down
logs:
	docker compose logs -f app worker dispatcher
reset-demo:
	docker compose exec -T app python manage.py seed_demo --reset
smoke:
	python3 scripts/smoke.py
screenshots:
	docker compose exec -T app python manage.py seed_demo --reset
	docker compose --profile checks run --no-deps --build --rm -v ./docs/demo:/workspace/docs/demo browser-check npx playwright test --config e2e-tour/tour.config.ts; result=$$?; docker compose exec -T app python manage.py seed_demo --reset; exit $$result

check:
	$(CHECK_ENV) docker compose up --build --wait
	$(CHECK_ENV) docker compose exec -T app python manage.py check
	$(CHECK_ENV) docker compose exec -T app python manage.py spectacular --validate --fail-on-warn --file /tmp/api-schema.yaml
	$(CHECK_ENV) docker compose exec -T app python manage.py makemigrations --check --dry-run
	$(CHECK_ENV) docker compose --profile checks run --no-deps --rm backend-check
	$(CHECK_ENV) docker compose --profile checks run --build --rm frontend-check
	$(CHECK_ENV) docker compose exec -T app python manage.py verify_runtime_role
	$(CHECK_ENV) docker compose exec -T app python production_check.py
	$(MAKE) browser-check
	$(CHECK_ENV) python3 scripts/database/rehearse.py
	$(MAKE) check-down
check-down:
	$(CHECK_ENV) docker compose --profile checks down --volumes --remove-orphans
browser-check:
	$(CHECK_ENV) docker compose exec -T app python manage.py cleanup_e2e
	$(CHECK_ENV) docker compose exec -T app python manage.py seed_e2e
	$(CHECK_ENV) docker compose --profile checks run --no-deps --build --rm browser-check; result=$$?; $(CHECK_ENV) docker compose exec -T app python manage.py cleanup_e2e; exit $$result

native-setup:
	python3 scripts/native_setup.py
native-dev:
	backend/.venv/bin/python scripts/native_dev.py
native-check:
	backend/.venv/bin/python scripts/native_check.py
