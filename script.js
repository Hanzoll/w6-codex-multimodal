
const imageInput1 = document.getElementById("imageInput1");
const imageInput2 = document.getElementById("imageInput2");

const imagePreview1 = document.getElementById("imagePreview1");
const imagePreview2 = document.getElementById("imagePreview2");

const placeholder1 = document.getElementById("placeholder1");
const placeholder2 = document.getElementById("placeholder2");

const describeButton = document.getElementById("describeButton");
const status = document.getElementById("status");

const description1 = document.getElementById("description1");
const description2 = document.getElementById("description2");

const OLLAMA_URL = "http://localhost:11434/api/chat";
const MODEL_NAME = "llava";

let selectedImage1 = null;
let selectedImage2 = null;

// Preview the first image.
imageInput1.addEventListener("change", () => {
    selectedImage1 = imageInput1.files[0] || null;

    showPreview(
        selectedImage1,
        imagePreview1,
        placeholder1
    );

    updateSelectionStatus();
});

// Preview the second image.
imageInput2.addEventListener("change", () => {
    selectedImage2 = imageInput2.files[0] || null;

    showPreview(
        selectedImage2,
        imagePreview2,
        placeholder2
    );

    updateSelectionStatus();
});

// Display an image preview.
function showPreview(file, preview, placeholder) {
    preview.hidden = true;
    preview.removeAttribute("src");
    placeholder.hidden = false;

    if (!file) {
        return;
    }

    if (!file.type.startsWith("image/")) {
        if (preview === imagePreview1) {
            selectedImage1 = null;
            imageInput1.value = "";
        } else {
            selectedImage2 = null;
            imageInput2.value = "";
        }

        status.textContent = "Please select a valid image file.";
        return;
    }

    preview.src = URL.createObjectURL(file);
    preview.hidden = false;
    placeholder.hidden = true;
}

// Check whether both images have been selected.
function updateSelectionStatus() {
    description1.textContent = "No description generated yet.";
    description2.textContent = "No description generated yet.";

    if (selectedImage1 && selectedImage2) {
        status.textContent =
            "Both images are selected. Ready to describe!";
    } else if (selectedImage1 || selectedImage2) {
        status.textContent =
            "One image selected. Please select the other image too.";
    } else {
        status.textContent =
            "Please select two images to begin.";
    }
}

// Describe both images when the button is clicked.
describeButton.addEventListener("click", async () => {
    // Handle missing images.
    if (!selectedImage1 || !selectedImage2) {
        status.textContent =
            "Please select both Image 1 and Image 2 before continuing.";
        return;
    }

    describeButton.disabled = true;

    description1.textContent = "Analyzing Image 1...";
    description2.textContent = "Analyzing Image 2...";

    status.textContent =
        "AI is analyzing both images. Please wait...";

    try {
        // Send each image separately to the AI.
        const results = await Promise.allSettled([
            describeImage(selectedImage1),
            describeImage(selectedImage2)
        ]);

        let successCount = 0;

        if (results[0].status === "fulfilled") {
            description1.textContent = results[0].value;
            successCount++;
        } else {
            description1.textContent =
                "Could not describe Image 1: " +
                results[0].reason.message;
        }

        if (results[1].status === "fulfilled") {
            description2.textContent = results[1].value;
            successCount++;
        } else {
            description2.textContent =
                "Could not describe Image 2: " +
                results[1].reason.message;
        }

        if (successCount === 2) {
            status.textContent =
                "Success! Both images have been described.";
        } else if (successCount === 1) {
            status.textContent =
                "Only one image was described successfully. Check the error above.";
        } else {
            status.textContent =
                "Both requests failed. Check that Ollama is running.";
        }
    } catch (error) {
        console.error("Unexpected error:", error);

        status.textContent =
            "Something went wrong: " + error.message;
    } finally {
        describeButton.disabled = false;
    }
});

// Send one image to Ollama and return its description.
async function describeImage(file) {
    const base64Image = await convertImageToBase64(file);

    const response = await fetch(OLLAMA_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: MODEL_NAME,
            messages: [
                {
                    role: "user",
                    content:
                        "Describe this image clearly. Identify the main objects, " +
                        "setting, and important visible details. Only describe " +
                        "what you can see in this image.",
                    images: [base64Image]
                }
            ],
            stream: false
        })
    });

    if (!response.ok) {
        throw new Error(
            `Ollama returned HTTP ${response.status}.`
        );
    }

    const data = await response.json();
    const result = data.message?.content;

    if (!result || !result.trim()) {
        throw new Error("The AI returned an empty description.");
    }

    return result.trim();
}

// Convert an image file into Base64.
function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            const dataUrl = reader.result;
            resolve(dataUrl.split(",")[1]);
        };

        reader.onerror = () => {
            reject(new Error("Could not read the image file."));
        };

        reader.readAsDataURL(file);
    });
}
