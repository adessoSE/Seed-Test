import json
import os

user = os.getlogin()
path = f'C:\\Users\\{user}\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Preferences'


data = json.loads(open(path ,encoding = "utf8").read())
deviceList = data["devtools"]["preferences"]["standardEmulatedDeviceList"]

devices = "["

for device in json.loads(deviceList):
    devices = devices + '\"' + device["title"] + '\"' + ", "
devices = devices[:-2] + "]"
print(devices)