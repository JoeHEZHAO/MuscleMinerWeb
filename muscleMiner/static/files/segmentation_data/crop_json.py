import cv2
import json, io

## change1: json_path

json_path = 'img_mask3_contours.json'
print json_path
with open(json_path) as json_data:
    res = json.load(json_data)

delete_list = []
save_list = []
length = len(res['contours'])

## change2: if statement

for index, key in enumerate(res['contours']):
    for coord in key['points']:
        if coord['x'] < 1000 or coord['x'] > 2500 or coord['y'] > 2500 or coord['y'] < 1000:
            delete_list.append(index)
            break
print len(delete_list)

for i in range(length):
    if i not in delete_list:
        save_list.append(i)

res['contours'] = [res['contours'][x] for x in save_list if res['contours'][x]] ## list comprehension

# change3: coords
for index, key in enumerate(res['contours']):
    for coord in key['points']:
        coord['x'] -= 1000
        coord['y'] -= 1000

# change4: save name
with open('img_mask3_1_contours.json', 'w') as newjson:
    json.dump(res, newjson, indent=4)
print 'finished !'

