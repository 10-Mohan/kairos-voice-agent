import pyaudio
import numpy as np

p = pyaudio.PyAudio()

# Generate a simple 1-second beep tone
sample_rate = 44100
duration = 1.0
frequency = 440.0
t = np.linspace(0, duration, int(sample_rate * duration), False)
tone = np.sin(frequency * t * 2 * np.pi)
audio = (tone * 32767).astype(np.int16).tobytes()

stream = p.open(
    format=pyaudio.paInt16,
    channels=1,
    rate=sample_rate,
    output=True,
    # no output_device_index - let it use system default,  # Headphones (510BT)
)

print("Playing test tone through device 4...")
stream.write(audio)
stream.stop_stream()
stream.close()
p.terminate()
print("Done.")