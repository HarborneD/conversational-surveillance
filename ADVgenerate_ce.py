import json
import urllib2
import os

import re

from osm_road_search import GetEstimatedRoadLatLong

import numpy as np

def GetAllCameraJson(force_fresh = False):
    cache_file = 'cached_cams.json'
    if(os.path.exists(cache_file) and not force_fresh):
        try:
            with open(cache_file, 'r') as fp:
                return json.load(fp)
        except:
            print("Load Cached Data Failed")
            return(GetAllCameraJson(True))

    else:
        all_cams_url = "https://api.tfl.gov.uk/Place/Type/JamCam"

        cameras = json.load(urllib2.urlopen(all_cams_url))
        
        with open('cached_cams.json', 'w') as fp:
            json.dump(cameras, fp, sort_keys=True, indent=4)
        
        return cameras


def GenerateCEStringFromCameraDict(camera, road_details=[]):
    tfl_api_prefix = "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/"
    ce_string = ""

    ce_string += "there is a traffic camera named 'tfl Camera "+ str(camera["id"]).replace("JamCams_00002.","").replace("JamCams_00001.","") +"' that\n"
    # ce_string += " is a image source and \n"
    # ce_string += " is a video source and \n"
    # ce_string += " is a geolocation source and \n"
    
    ce_string += "  has '"+str(camera["lon"])+"' as longitude and \n"
    ce_string += "  has '"+str(camera["lat"])+"' as latitude and\n"
    ce_string += "  has '"+str(camera["url"])+"' as url and\n"
    ce_string += "  has '"+str(camera["id"])+"' as id and\n"
    
    common_name = str(camera["commonName"])

    ce_string += "  has '"+common_name+"' as common name and\n"
    
    ce_string += "  has '"+tfl_api_prefix+str(camera["id"]).replace("JamCams_","")+".jpg' as image url and\n"
    ce_string += "  has '"+tfl_api_prefix+str(camera["id"]).replace("JamCams_","")+".mp4' as video url"
    
    for road_detail in road_details:
        ce_string += "\nand can show the location '{road_name}'".format(road_name= road_detail["road_name"])

    ce_string += "."
    
    return ce_string


def RoadDetailsFromCamera(camera,road_name_replacements):
    common_name = str(camera["commonName"])

    for replacement in road_name_replacements:
        common_name = common_name.replace(replacement[0],replacement[1])

    roads = common_name.split("/")

    road_details = []

    for road in roads:
        regex = re.compile("\w\d+ ")
        cleaned_road = re.sub(regex, "", road).strip()
        if(len(cleaned_road) <= 3):
            continue
        
        estimated_road_pos = GetEstimatedRoadLatLong(cleaned_road, np.array([ camera["lat"],camera["lon"] ]))

        if(len(estimated_road_pos) >0):
            road_details.append({"road_name":cleaned_road,"latitude":estimated_road_pos[0],"longitude":estimated_road_pos[1]})
        else:
            road_details.append({"road_name":cleaned_road,"latitude":camera["lat"],"longitude":camera["lon"]})
    
    return road_details


def GenerateRoadCE(road_name, longitude=None, latitude=None):
    full_ce_string = """there is a road named '{road_name}' that
  has '{longitude}' as longitude and 
  has '{latitude}' as latitude and
  has '{road_name}' as road name."""

    simple_ce_string = """there is a road named '{road_name}' that
  has '{road_name}' as road name."""

    if(longitude):
        return full_ce_string.format(road_name=road_name,longitude=longitude,latitude=latitude)
    else:
        return simple_ce_string.format(road_name=road_name)



cameras = GetAllCameraJson()

print(cameras[0].keys())

road_name_replacements = [("Rd","Road"),("Ave","Avenue"),("St","Street"),("Ln","Lane"),("Sq","Square"),("Gt","Great"),("HSmith","Hammersmith"),("Lwr","Lower"),("Park","Park"),("Brg","Bridge"),("Brd","Bridge"),("Tnl","Tunnel")]


ce_output_string = ""
road_ce_output_string = ""

all_road_details = []

for camera in cameras:
    road_details = RoadDetailsFromCamera(camera,road_name_replacements)
    all_road_details += road_details
    
    ce_output_string += GenerateCEStringFromCameraDict(camera,road_details)
    ce_output_string += "\n\n"


road_names_done = []

for road_detail in all_road_details:
    if(road_detail["road_name"] in road_names_done):
        continue
    else:
        road_names_done.append(road_detail["road_name"])

    if("longitude" in road_detail):
        road_ce_output_string += GenerateRoadCE(road_detail["road_name"],road_detail["longitude"],road_detail["latitude"])
    else:
        road_ce_output_string += GenerateRoadCE(road_detail["road_name"])
    
    road_ce_output_string += "\n\n"


with open('cameras.ce', 'w') as ce_file:
    ce_file.write(ce_output_string)


with open('roads.ce', 'w') as ce_file:
    ce_file.write(road_ce_output_string)
        

