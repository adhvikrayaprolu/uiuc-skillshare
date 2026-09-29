PYTHON ?= python3
.PHONY: check
check:
	cd backend && $(PYTHON) manage.py check
	cd backend && $(PYTHON) manage.py makemigrations --check --dry-run
	cd backend && $(PYTHON) manage.py test
	npm --prefix frontend run lint
	npm --prefix frontend run build
