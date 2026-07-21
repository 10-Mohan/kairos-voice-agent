import pyaudio
p = pyaudio.PyAudio()
info = p.get_default_output_device_info()
print("Default output device index:", info['index'])
print("Default output device name:", info['name'])