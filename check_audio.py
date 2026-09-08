import pyaudio 
p = pyaudio.PyAudio() 
for i in range(p.get_device_count()): 
    info = p.get_device_info_by_index(i) 
    direction = "OUT" if info['maxOutputChannels'] > 0 else "IN" 
    print(i, info['name'], "-", direction) 
