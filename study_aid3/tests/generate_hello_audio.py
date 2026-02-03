import os
from gtts import gTTS
from pydub import AudioSegment

def generate_hello_audio(output_path="hello_world.wav"):
    """
    Generates a 'Hello, world.' audio file in WAV format.
    """
    # --- Generate speech using gTTS ---
    text = "Hello, world."
    tts = gTTS(text=text, lang='en')
    mp3_path = "temp_hello.mp3"
    tts.save(mp3_path)

    # --- Convert MP3 to WAV ---
    audio = AudioSegment.from_mp3(mp3_path)
    # Set to 16kHz mono, which is standard for speech recognition
    audio = audio.set_frame_rate(16000).set_channels(1)
    audio.export(output_path, format="wav")

    # --- Clean up temporary MP3 file ---
    os.remove(mp3_path)
    print(f"Generated '{output_path}' successfully.")

if __name__ == '__main__':
    # Place it in the tests directory
    base_dir = os.path.dirname(__file__)
    output_file_path = os.path.join(base_dir, "hello_world.wav")
    generate_hello_audio(output_file_path)