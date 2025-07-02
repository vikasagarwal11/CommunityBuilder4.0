/*
# Add HTTP Extension and HTTP POST Function

1. New Features
  - Adds PostgreSQL HTTP extension for making HTTP requests from the database
  - Creates a helper function for making HTTP POST requests with error handling

2. Security
  - Function is created with appropriate error handling
*/

-- Enable the HTTP extension
CREATE EXTENSION IF NOT EXISTS http;

-- Create a function to make HTTP POST requests with error handling
CREATE OR REPLACE FUNCTION http_post(url text, body jsonb, content_type text DEFAULT 'application/json')
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  response http_response;
BEGIN
  response := http_post(url, body::text, ARRAY[http_header('Content-Type', content_type)]);
  IF response.status_code != 200 THEN
    RAISE EXCEPTION 'HTTP POST failed with status %: %', response.status_code, response.content;
  END IF;
  RETURN response.content::jsonb;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'HTTP POST error: %', SQLERRM;
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION http_post IS 'Makes an HTTP POST request and returns the response as JSON with error handling';