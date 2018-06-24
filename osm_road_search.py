import requests
import json

import numpy as np

import time

def GetEstimatedRoadLatLong(road_name, camera_pos):
	time.sleep(1)
	api_url = " https://nominatim.openstreetmap.org/search/{road_name}?format=json"

	api_request = api_url.format(road_name=road_name)
	roads = requests.get(api_request)

	print(roads)
	
	roads = eval(str(roads.json()))

	current_road_pos = []
	small_dist = 100000

	for road in roads:
		road_pos = np.array([float(road["lat"]),float(road["lon"])])
		dist = abs(np.linalg.norm(camera_pos-road_pos))
		
		if(dist < small_dist):
			small_dist = dist
			current_road_pos = road_pos

	print(camera_pos)
	print(current_road_pos) 	
	return current_road_pos

if __name__ == '__main__':
	road_name = "tennyson road"
	camera_pos = np.array([52,1])

	GetEstimatedRoadLatLong(road_name,camera_pos)