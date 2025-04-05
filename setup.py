from setuptools import setup, find_packages

setup(
    name="streamlit-audio-blob",
    version="0.1.0",
    author="Manus",
    author_email="info@example.com",
    description="A Streamlit component for audio-reactive visualization for Alzheimer's screening",
    long_description="A Streamlit component that provides an audio-reactive visualization that responds to microphone input, designed with accessibility features for elderly users.",
    long_description_content_type="text/plain",
    url="",
    packages=find_packages(),
    include_package_data=True,
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "Intended Audience :: Healthcare Industry",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
    ],
    python_requires=">=3.7",
    install_requires=[
        "streamlit >= 1.0.0",
    ],
)
