package main

import (
	// b64 "encoding/base64"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"strings"

	"github.com/gorilla/websocket"
	gubrak "github.com/novalagung/gubrak/v2"
)

type SocketPayload struct {
	Type    string
	Message string
	Image   string
}

type SocketResponse struct {
	From    string
	Type    string
	Message string
	Image   string
}

type WebSocketConnection struct {
	*websocket.Conn
	Username string
}

type M map[string]interface{}

const MESSAGE_NEW_USER = "New User"
const MESSAGE_CHAT = "Chat"
const MESSAGE_IMAGE = "Image"
const MESSAGE_LEAVE = "Leave"

var connections = make([]*WebSocketConnection, 0)

func main() {
	// Serve static files (CSS and JS) from the "static" directory
	fs := http.FileServer(http.Dir("static"))
	http.Handle("/static/", http.StripPrefix("/static/", fs))

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		content, err := ioutil.ReadFile("index.html")
		if err != nil {
			http.Error(w, "Could not open requested file", http.StatusInternalServerError)
			return
		}

		fmt.Fprintf(w, "%s", content)
	})

	http.HandleFunc("/users", func(w http.ResponseWriter, r *http.Request) {
		numUsers := len(connections)
		log.Printf("Ada berapa users: %v", numUsers)
		fmt.Fprintf(w, "%d", numUsers)
	})

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		currentGorillaConn, err := websocket.Upgrade(w, r, w.Header(), 1024, 1024)
		if err != nil {
			http.Error(w, "Could not open websocket connection", http.StatusBadRequest)
		}

		username := r.URL.Query().Get("username")
		currentConn := WebSocketConnection{Conn: currentGorillaConn, Username: username}
		connections = append(connections, &currentConn)

		go handleIO(&currentConn, connections)
	})

	fmt.Println("Server starting at :8080")
	http.ListenAndServe(":8080", nil)
}

func handleIO(currentConn *WebSocketConnection, connections []*WebSocketConnection) {
	defer func() {
		if r := recover(); r != nil {
			log.Println("ERROR", fmt.Sprintf("%v", r))
		}
	}()

	broadcastMessage(currentConn, MESSAGE_NEW_USER, "")

	for {
		payload := SocketPayload{}
		err := currentConn.ReadJSON(&payload)
		if err != nil {
			if strings.Contains(err.Error(), "websocket: close") {
				broadcastMessage(currentConn, MESSAGE_LEAVE, "")
				ejectConnection(currentConn)
				return
			}

			log.Println("ERROR", err.Error())
			continue
		}

		switch payload.Type {
		case MESSAGE_CHAT:
			log.Printf("Ini basedata payload: %v", payload.Message)
			broadcastMessage(currentConn, MESSAGE_CHAT, payload.Message)
		case MESSAGE_IMAGE:
			// log.Printf("Ini basedata payload: %v", payload.Image)
			broadcastMessageImage(currentConn, MESSAGE_IMAGE, payload.Image)
		}
	}
}

func ejectConnection(currentConn *WebSocketConnection) {
	filtered := gubrak.From(connections).Reject(func(each *WebSocketConnection) bool {
		return each == currentConn
	}).Result()
	connections = filtered.([]*WebSocketConnection)
}

func broadcastMessage(currentConn *WebSocketConnection, kind, message string) {
	// log.Printf("Ini basedata payload: %v", message)
	for _, eachConn := range connections {
		if eachConn == currentConn {
			continue
		}

		eachConn.WriteJSON(SocketResponse{
			From:    currentConn.Username,
			Type:    kind,
			Message: message,
		})
	}
}

func broadcastMessageImage(currentConn *WebSocketConnection, kind, image string) {
	// log.Printf("Ini basedata payload: %v", image)
	for _, eachConn := range connections {
		if eachConn == currentConn {
			continue
		}

		eachConn.WriteJSON(SocketResponse{
			From:  currentConn.Username,
			Type:  kind,
			Image: image,
		})
	}
}
