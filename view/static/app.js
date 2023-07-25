var app = {};
        app.ws = undefined;
        app.container = undefined;
        app.showFileName = undefined;
        app.usersOnline = 0;

        app.init = function() {
            if (!window.WebSocket) {
                alert('Your browser does not support WebSocket');
                return;
            }

            app.updateUsersOnline = function() {
                var usersOnlineElement = document.getElementById('usersOnline');
                usersOnlineElement.innerHTML = app.usersOnline + ' users online';
            };

            var name = prompt('Enter your name please:') || "No name";
            document.querySelector('.username').innerText = name;

            app.container = document.querySelector('.container');

            app.ws = new WebSocket("ws://localhost:8080/ws?username=" + name);

            app.ws.onopen = function() {
                var message = '<b>me</b>: connected';
                app.print(message);

                fetch("/users")
                .then((response) => response.text())
                .then((data) => {
                    app.usersOnline = parseInt(data);
                    app.updateUsersOnline();
                })
                .catch((error) => console.log("Error fetching users:", error));
            };

            app.ws.onmessage = function(event) {
                var res = JSON.parse(event.data);

                var message = '';
                if (res.Type === 'New User') {
                    message = 'User <b>' + res.From + '</b>: connected';
                    fetch("/users")
                .then((response) => response.text())
                .then((data) => {
                    app.usersOnline = parseInt(data);
                    app.updateUsersOnline();
                })
                .catch((error) => console.log("Error fetching users:", error));
                } else if (res.Type === 'Leave') {
                    message = 'User <b>' + res.From + '</b>: disconnected';
                    fetch("/users")
                .then((response) => response.text())
                .then((data) => {
                    app.usersOnline = parseInt(data);
                    app.updateUsersOnline();
                })
                .catch((error) => console.log("Error fetching users:", error));
                } else if (res.Type === 'Image') {
                    message = '<b>' + res.From + '</b>: <img src="data:image/png;base64,' + res.Image +
                        '" class="image-size">';
                } else {
                    message = '<b>' + res.From + '</b>: ' + res.Message;
                }

                app.print(message);
            };

            app.ws.onclose = function() {
                var message = '<b>me</b>: disconnected';
                app.print(message);

                fetch("/users")
                .then((response) => response.text())
                .then((data) => {
                    app.usersOnline = parseInt(data);
                    app.updateUsersOnline();
                })
                .catch((error) => console.log("Error fetching users:", error));
            };
        };

        app.print = function(message) {
            var el = document.createElement("p");
            el.innerHTML = message;
            app.container.append(el);
            console.log(message);
        };

        app.sendMessage = function(event) {
            event.preventDefault();

            var inputMessage = document.querySelector('.input-message');
            var inputFile = document.querySelector('.input-file');
            var fileLabel = document.getElementById('fileLabel');

            if (inputMessage.value !== '') {
                app.ws.send(JSON.stringify({
                    Type: 'Chat',
                    Message: inputMessage.value
                }));

                var message = '<b>me</b>: ' + inputMessage.value;
                app.print(message);

                inputMessage.value = '';
            }

            if (inputFile.files.length > 0) {
                var file = inputFile.files[0];

                var reader = new FileReader();

                fileLabel.innerText = 'Uploaded: ' + file.name;
                reader.onload = function(event) {
                    const base64Data = event.target.result.split(',')[
                        1]; // Extract the base64-encoded data from the Data URL
                    console.log("Masuk ga ya: ", base64Data);

                    // Send only the base64-encoded data without the data URI header
                    app.ws.send(JSON.stringify({
                        Type: 'Image',
                        Image: base64Data,
                    }));

                    const message = '<b>me</b>: <img src="' + event.target.result + '" class="image-size">';
                    app.print(message);
                };
                reader.readAsDataURL(file);

                inputFile.value = ''; // Clear the selected file from the input field
            }
        };

        // app.showFileName = function() {
        //     var inputFile = document.querySelector('.input-file');
        //     var fileLabel = document.getElementById('fileLabel');

        //     if (inputFile.files.length > 0) {
        //         var file = inputFile.files[0];

        //         fileLabel.innerText = 'Uploaded: ' + file.name;
        //     }

        // };

        app.onFileInputChange = function (event) {
          event.preventDefault()
            const file = inputElement.files[0];
            if (!file) return;

            // Display the file name in the label
            const fileLabel = document.getElementById('fileLabel');
            fileLabel.innerText = 'Selected file: ' + file.name;
          };

        window.onload = app.init;
