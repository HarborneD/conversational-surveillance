import json
import urllib2
import os
import requests


hudson_url_interp = "http://localhost:8080/ce-store/special/hudson/interpreter"
hudson_url_answer = "http://localhost:8080/ce-store/special/hudson/answerer"

hudson_url_execute = "http://localhost:8080/ce-store/special/hudson/executor"


post_data = "what is a traffic camera"


s = requests.post(hudson_url_interp, data="what is traffic camera")
print(s.text)
r = requests.post(hudson_url_answer, data=s.text)
print(r.text)
