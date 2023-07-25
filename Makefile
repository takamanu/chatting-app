server:
	go run main.go

statik:
	statik -src=./view -dest=./view 

.PHONY:server statik