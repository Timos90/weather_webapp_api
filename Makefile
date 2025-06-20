start:
	cd frontend/ && npm start &
	cd backend/ && .venv/bin/python3 manage.py runserver --settings=config.settings.dev

dev-venv:
	cd backend/ && python3 -m venv .venv --prompt $(name)

dev-install:
	cd backend/ && .venv/bin/pip install -r requirements/dev.txt

dev-create-secretkey:
	cd backend/ && .venv/bin/python3 scripts/generate_SECRET_KEY.py

dev-createdb-name:
	cd backend/ && .venv/bin/python3 scripts/create_DB_NAME.py

dev-createdb-un-pw:
	cd backend/ && .venv/bin/python3 scripts/create_DB_USER_n_DB_PWD.py

dev-m:
	cd backend/ && .venv/bin/python3 manage.py migrate --settings=config.settings.dev

dev-makem:
	cd backend/ && .venv/bin/python3 manage.py makemigrations --settings=config.settings.dev

dev-showm:
	cd backend/ && .venv/bin/python3 manage.py showmigrations --settings=config.settings.dev

dev-sqlm:
	cd backend/ && .venv/bin/python3 manage.py sqlmigrate $(a) $(m) --settings=config.settings.dev  

dev-dbshell:
	cd backend/ && .venv/bin/python3 manage.py dbshell --settings=config.settings.dev

dev-super:
	cd backend/ && .venv/bin/python3 manage.py createsuperuser --settings=config.settings.dev

dev-startapp:
	cd backend/apps/ && ../.venv/bin/python3 ../manage.py startapp $(app) --settings=config.settings.dev

dev-shell-plus:
	cd backend/ && .venv/bin/python3 manage.py shell_plus --settings=config.settings.dev

dev-test-user:
	cd backend/ && .venv/bin/python3 manage.py test apps.user.tests.test_models apps.user.tests.test_serializers apps.user.tests.test_views --settings=config.settings.dev

dev-test-weather:
	cd backend/ && .venv/bin/python3 manage.py test apps.weather.tests.test_models apps.weather.tests.test_serializers apps.weather.tests.test_views --settings=config.settings.dev

dev-test-personalization:
	cd backend/ && .venv/bin/python3 manage.py test apps.personalization.tests.test_models apps.personalization.tests.test_serializers apps.personalization.tests.test_views apps.personalization.tests.test_outfit_logic --settings=config.settings.dev
###### FRONTEND SETUP ###############

dev-npm-install:
	cd frontend/ && npm install


###########Production##############
prod-m:
	cd backend/ && .venv/bin/python3 manage.py migrate --settings=config.settings.prod

prod-makem:
	cd backend/ && .venv/bin/python3 manage.py makemigrations --settings=config.settings.prod

prod-showm:
	cd backend/ && .venv/bin/python3 manage.py showmigrations --settings=config.settings.prod

prod-sqlm:
	cd backend/ && .venv/bin/python3 manage.py sqlmigrate $(a) $(m) --settings=config.settings.prod  

prod-dbshell:
	cd backend/ && .venv/bin/python3 manage.py dbshell --settings=config.settings.prod

prod-super:
	cd backend/ && .venv/bin/python3 manage.py createsuperuser --settings=config.settings.prod

prod-startapp:
	cd backend/apps/ && ../.venv/bin/python3 ../manage.py startapp $(app) --settings=config.settings.prod

prod-shell-plus:
	cd backend/ && .venv/bin/python3 manage.py shell_plus --settings=config.settings.prod