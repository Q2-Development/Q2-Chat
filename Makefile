up:
	docker-compose up -d

down:
	docker-compose down

rebuild:
	docker-compose down --volumes --remove-orphans
	docker-compose up --build
