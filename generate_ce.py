import json
import urllib2
import os


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


def GenerateCEStringFromCameraDict(camera):
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
    ce_string += "  has '"+str(camera["commonName"])+"' as common name and\n"
    
    ce_string += "  has '"+tfl_api_prefix+str(camera["id"]).replace("JamCams_","")+".jpg' as image url and\n"
    ce_string += "  has '"+tfl_api_prefix+str(camera["id"]).replace("JamCams_","")+".mp4' as video url"
    
    ce_string += "."
    
    return ce_string

cameras = GetAllCameraJson()

print(cameras[0].keys())

ce_output_string = ""
for camera in cameras:
    ce_output_string += GenerateCEStringFromCameraDict(camera)
    ce_output_string += "\n\n"

with open('cameras.ce', 'w') as ce_file:
    ce_file.write(ce_output_string)
        

