import cv2
im = cv2.imread('seg_bg.png')
print im.shape

for i in range(0,3917):
    for j in range(0,4143):
        for k in range(0,3):
            if im[i,j,k] > 50:
                im[i,j,k] = 255
            else:
                im[i,j,k] = 0
cv2.imwrite('seg_bg_mask.png', im)
