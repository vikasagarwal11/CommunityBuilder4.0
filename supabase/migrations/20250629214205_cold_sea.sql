/*
  # Add HTTP extension and custom HTTP POST function
  
  1. New Extensions
    - Enables the PostgreSQL HTTP extension for making HTTP requests from the database
  
  2. New Functions
    - `custom_http_post`: A wrapper function for HTTP POST requests with error handling
*/

-- Enable the HTTP extension
CREATE EXTENSION IF NOT EXISTS http;

-- Create a function to make HTTP POST requests with error handling
-- Using a different name to avoid conflict with the built-in http_post function
CREATE OR REPLACE FUNCTION custom_http_post(url text, body jsonb, content_type text DEFAULT 'application/json')
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  response http_response;
BEGIN
  response := http((
    'POST',
    url,
    ARRAY[http_header('Content-Type', content_type)],
    body::text,
    NULL
  )::http_request);
  
  IF response.status_code != 200 THEN
    RAISE NOTICE 'HTTP POST failed with status %: %', response.status_code, response.content;
  END IF;
  
  RETURN response.content::jsonb;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'HTTP POST error: %', SQLERRM;
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION custom_http_post IS 'Makes an HTTP POST request and returns the response as JSON with error handling';