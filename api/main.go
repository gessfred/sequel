package main

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/awserr"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/ses"
	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
	"github.com/rs/cors"
)

type Result struct {
	Columns []string        `json:"columns"`
	Rows    [][]interface{} `json:"rows"`
}

type RequestBody struct {
	Query        string `json:"query"`
	DataSourceID string `json:"datasource_id"`
}

func executeQuery(db *sql.DB, query string) ([]string, [][]interface{}, error) {
	// Execute the query
	rows, err := db.Query(query)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	// Get the column names
	columns, err := rows.Columns()
	if err != nil {
		return nil, nil, err
	}

	// Create a slice to hold the column values
	values := make([]interface{}, len(columns))
	valuePtrs := make([]interface{}, len(columns))
	for i := range columns {
		valuePtrs[i] = &values[i]
	}

	// Create a slice to hold the rows
	var resultRows [][]interface{}

	// Iterate over the query results
	for rows.Next() {
		// Scan the row into the slice of values
		err := rows.Scan(valuePtrs...)
		if err != nil {
			return nil, nil, err
		}

		// Create a slice to hold the current row's values
		rowValues := make([]interface{}, len(columns))
		for i, col := range values {
			if value, ok := col.([]byte); ok {
				rowValues[i] = string(value)
			} else {
				rowValues[i] = col
			}
		}

		// Append the row to the result rows
		resultRows = append(resultRows, rowValues)
	}

	if err = rows.Err(); err != nil {
		return nil, nil, err
	}

	return columns, resultRows, nil
}

func DecodeRequestBody(r *http.Request, v interface{}) error {
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		return err
	}
	defer r.Body.Close()

	err = json.Unmarshal(body, v)
	if err != nil {
		return err
	}

	return nil
}

func respondWithJSON(w http.ResponseWriter, data interface{}, statusCode int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	err := json.NewEncoder(w).Encode(data)
	if err != nil {
		fmt.Println(err.Error())
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func queryHandler(w http.ResponseWriter, r *http.Request, datastore *Datastore) {
	// Read the POST body
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Parse the request body as JSON
	var requestBody RequestBody
	err = json.Unmarshal(body, &requestBody)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	datasource, err := datastore.GetDataSourceByID(requestBody.DataSourceID) // r.URL.Query().Get("datasource_id")
	if err != nil {
		fmt.Println(err)
	}
	fmt.Println(datasource.Name)

	// Access the "query" field from the request body
	query := requestBody.Query

	// Print the extracted "query" field
	fmt.Println("Received query:", query)

	// Open a connection to the database
	db, err := sql.Open("postgres", datasource.ConnectionString)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Test the connection
	err = db.Ping()
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	columns, rows, err := executeQuery(db, query)
	if err != nil {
		fmt.Println(err.Error())
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Create a Result struct
	result := Result{
		Columns: columns,
		Rows:    rows,
	}

	// Set the response Content-Type to application/json
	w.Header().Set("Content-Type", "application/json")

	// Encode the result as JSON
	err = json.NewEncoder(w).Encode(result)
	if err != nil {
		fmt.Println(err.Error())
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

type ChallengeRequestBody struct {
	UserEmail string `json:"user_email"`
	OTP       string `json:"otp"`
}

type LoginToken struct {
	UserEmail string `json:"user_email"`
	Token     string `json:"token"`
}

func generateOTP() string {
	key := make([]byte, 32) // Generating a 256-bit key
	_, err := rand.Read(key)
	if err != nil {
		panic(err)
	}

	// Convert key to hexadecimal
	hexKey := hex.EncodeToString(key)
	fmt.Printf("Generated Key: %s\n", hexKey)
	return hexKey
}

func sendEmail(destination, subject, message string) {
	sess, err := session.NewSession(&aws.Config{
		Region:      aws.String("us-east-1"),
		Credentials: credentials.NewStaticCredentials(os.Getenv("SES_USER_ID"), os.Getenv("SES_USER_SECRET"), ""),
	})

	svc := ses.New(sess)

	input := &ses.SendEmailInput{
		Destination: &ses.Destination{
			CcAddresses: []*string{},
			ToAddresses: []*string{
				aws.String(destination),
			},
		},
		Message: &ses.Message{
			Body: &ses.Body{
				Text: &ses.Content{
					Data: aws.String(message),
				},
			},
			Subject: &ses.Content{
				Data: aws.String(subject),
			},
		},
		Source: aws.String("bot@auth.sequel.gessfred.xyz"),
	}

	result, err := svc.SendEmail(input)
	if err != nil {
		if aerr, ok := err.(awserr.Error); ok {
			switch aerr.Code() {
			default:
				fmt.Println(aerr.Error())
			}
		} else {
			fmt.Println(err.Error())
		}
		return
	}

	fmt.Println("Email Sent to address: " + *result.MessageId)
}

func main() {
	datastore, err := NewDatastore(mongoUrl, "sequel")
	if err != nil {
		log.Fatal(err)
	}
	defer datastore.Close()
	fmt.Println("starting server...")

	router := mux.NewRouter()

	router.HandleFunc("/api/version", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "0.0.0")
	})

	router.HandleFunc("/api/query", func(w http.ResponseWriter, r *http.Request) {

		queryHandler(w, r, datastore)
	})

	router.HandleFunc("/api/login/otp", func(w http.ResponseWriter, r *http.Request) {
		fmt.Println(r.URL.Query().Get("user_email"))
		otp := generateOTP()
		err := datastore.WriteUser(&User{
			UserEmail: r.URL.Query().Get("user_email"),
			Auth: struct {
				Token string    `bson:"token"`
				TTL   time.Time `bson:"ttl"`
				OTP   string    `bson:"otp"`
			}{
				Token: "dummy-token",
				TTL:   time.Now().Add(time.Hour),
				OTP:   otp,
			},
		})
		sendEmail(r.URL.Query().Get("user_email"), "Sequel connection code", otp)
		if err != nil {
			fmt.Println(err.Error())
		}
	})

	router.HandleFunc("/api/login", func(w http.ResponseWriter, r *http.Request) {
		var challenge ChallengeRequestBody
		err := DecodeRequestBody(r, &challenge)
		if err != nil {
			fmt.Println(err.Error())
		}
		user, err := datastore.GetUserByEmail(challenge.UserEmail)
		if err != nil {
			fmt.Println(err.Error())
		}
		if user.Auth.OTP == challenge.OTP {
			fmt.Println("Challenge successful")
		}
		respondWithJSON(w, LoginToken{
			UserEmail: challenge.UserEmail,
			Token:     user.Auth.Token,
		}, 200)
	})

	router.HandleFunc("/api/datasources", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			var datasource DataSource
			err := DecodeRequestBody(r, &datasource)
			if err != nil {
				fmt.Println(err.Error())
			}
			// TODO get owner from authorization
			// TODO set creation_date
			fmt.Println(datasource)
			datastore.WriteDataSource(&datasource)
		} else if r.Method == "GET" {
			datasources, err := datastore.GetDataSourcesByOwner(r.URL.Query().Get("owner"))
			if err != nil {
				fmt.Println(err)
			}
			respondWithJSON(w, datasources, 200)
		}
	})

	router.HandleFunc("/api/notebooks", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			var notebook Notebook
			err := DecodeRequestBody(r, &notebook)
			if err != nil {
				fmt.Println(err.Error())
			}
			// TODO get owner from authorization
			// TODO set creation_date
			datastore.WriteNotebook(&notebook)
		} else if r.Method == "GET" {
			notebooks, err := datastore.GetNotebooksByOwner(r.URL.Query().Get("owner"))
			if err != nil {
				fmt.Println(err)
			}
			respondWithJSON(w, notebooks, 200)
		}
	})

	// Start the HTTP server
	c := cors.Default().Handler(router)
	log.Fatal(http.ListenAndServe(":8080", c))

}
