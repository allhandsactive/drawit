(function () {
  // The width and height of the captured photo. We will set the
  // width to the value defined here, but the height will be
  // calculated based on the aspect ratio of the input stream.

  let width = 1440; // We will scale the photo width to this
  let height = 0; // This will be computed based on the input stream

  // |streaming| indicates whether or not we're currently streaming
  // video from the camera. Obviously, we start at false.

  let streaming = false;

  // The various HTML elements we need to configure or control. These
  // will be set by the startup() function.

  let video = null;
  let canvas = null;
  let photo = null;
  let startbutton = null;
  let cropper = null;
  let flipbutton = null;
  let aspectRatio = 4 / 6;
  let photoData = null;
  let cropData = {};
  let processbutton = null;
  let uploadbutton = null;
  let landscape = false;

  function showViewLiveResultButton() {
    if (window.self !== window.top) {
      // Ensure that if our document is in a frame, we get the user
      // to first open it in its own tab or window. Otherwise, it
      // won't be able to request permission for camera access.
      document.querySelector(".contentarea").remove();
      const button = document.createElement("button");
      button.textContent = "View live result of the example code above";
      document.body.append(button);
      button.addEventListener("click", () => window.open(location.href));
      return true;
    }
    return false;
  }

  function startup() {
    if (showViewLiveResultButton()) {
      return;
    }
    video = document.getElementById("video");
    canvas = document.getElementById("canvas");
    photo = document.getElementById("photo");
    startbutton = document.getElementById("startbutton");
    flipbutton = document.getElementById("flip");
    processbutton = document.getElementById("process");
    uploadbutton = document.getElementById("upload");

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then(function (stream) {
        video.srcObject = stream;
        video.play();
      })
      .catch(function (err) {
        console.log("An error occurred: " + err);
      });

    video.addEventListener(
      "canplay",
      function (ev) {
        if (!streaming) {
          height = video.videoHeight / (video.videoWidth / width);

          // Firefox currently has a bug where the height can't be read from
          // the video, so we will make assumptions if this happens.

          if (isNaN(height)) {
            height = width / (4 / 3);
          }

          video.setAttribute("width", width);
          video.setAttribute("height", height);
          canvas.setAttribute("width", width);
          canvas.setAttribute("height", height);
          streaming = true;
        }
      },
      false,
    );

    startbutton.addEventListener(
      "click",
      function (ev) {
        takepicture();
        ev.preventDefault();
      },
      false,
    );

    flipbutton.addEventListener(
      "click",
      function (ev) {
        if (aspectRatio < 1) {
          // landscape
          aspectRatio = 6 / 4;
          landscape = true;
        } else {
          // portrait
          aspectRatio = 4 / 6;
          landscape = false;
        }
        cropper.setAspectRatio(aspectRatio);
      },
      false,
    );

    for (let i = 15; i <= 87; i += 9) {
      const img = document.getElementById(`p${i}`);
      img.addEventListener(
        "click",
        function (ev) {
          process2(i);
        },
        false,
      );
    }

    for (let i = 1; i < 10; i += 1) {
      const img = document.getElementById(`p${i}`);
      img.addEventListener(
        "click",
        function (ev) {
          process3(i);
        },
        false,
      );
    }

    processbutton.addEventListener(
      "click",
      function (ev) {
        for (let i = 0; i < 9; i++) {
          const img = document.getElementById(`p${i * 9 + 15}`);
          img.src = "/images/loading.gif";
        }
        document.getElementById("ph1").scrollIntoView(true);
        fetch("/process1", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...cropData, photo: photoData }),
        })
          .then((res) => res.json())
          .then((data) => {
            const { jobId, images } = data;
            images.forEach((e, i) => {
              const img = document.getElementById(`p${i * 9 + 15}`);
              img.src = e;
              img.setAttribute("data-job-id", jobId);
            });
            document.getElementById("job-id").innerText = jobId;
            document.getElementById("ph1").scrollIntoView(true);
          })
          .catch((err) => {
            alert(`Error while processing: ${err}`);
          });
      },
      false,
    );

    uploadbutton.addEventListener(
      "change",
      function (ev) {
        if (!this.files || !this.files[0]) return;

        const context = canvas.getContext("2d");
        const reader = new FileReader();
        reader.addEventListener("load", (evt) => {
          photo.setAttribute("src", evt.target.result);
          photoData = evt.target.result;

          if (cropper) cropper.destroy();

          cropper = new Cropper(photo, {
            aspectRatio,
            crop(event) {
              cropData = event.detail;
            },
          });

          document.getElementById("ph0").scrollIntoView(true);
        });
        reader.readAsDataURL(this.files[0]);
      },
      false,
    );

    clearphoto();
  }

  function process2(choice) {
    const img = document.getElementById(`p${choice}`);
    const jobId = img.getAttribute("data-job-id");
    for (let i = 0; i < 9; i++) {
      const img = document.getElementById(`p${i + 1}`);
      img.src = "/images/loading.gif";
    }
    document.getElementById("ph2").scrollIntoView(true);
    fetch("/process2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jobId, choice }),
    })
      .then((res) => res.json())
      .then((data) => {
        data.forEach((e, i) => {
          const img = document.getElementById(`p${i + 1}`);
          img.src = e;
          img.setAttribute("data-job-id", jobId);
          img.setAttribute("data-choice", choice);
        });
        document.getElementById("ph2").scrollIntoView(true);
      })
      .catch((err) => {
        alert(`Error while processing: ${err}`);
      });
  }

  function process3(choice) {
    const img = document.getElementById(`p${choice}`);
    const jobId = img.getAttribute("data-job-id");
    const choice1 = parseInt(img.getAttribute("data-choice"), 10);
    const preview = document.getElementById("download-preview");
    preview.src = "/images/loading.gif";
    document.getElementById("ph3").scrollIntoView(true);

    fetch("/process3", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jobId, choice: choice1 + choice - 5, landscape }),
    })
      .then((res) => res.json())
      .then((data) => {
        const download = document.getElementById("download");
        download.style.display = "block";
        download.href = data;
        const preview = document.getElementById("download-preview");
        preview.src = data;
        if (landscape) {
          preview.style = "transform: rotate(90deg)";
        } else {
          preview.style = "transform: rotate(180deg)";
        }
        document.getElementById("ph3").scrollIntoView(true);
      })
      .catch((err) => {
        alert(`Error while processing: ${err}`);
      });
  }

  // Fill the photo with an indication that none has been
  // captured.

  function clearphoto() {
    const context = canvas.getContext("2d");
    context.fillStyle = "#AAA";
    context.fillRect(0, 0, canvas.width, canvas.height);

    const data = canvas.toDataURL("image/png");
    photo.setAttribute("src", data);
  }

  // Capture a photo by fetching the current contents of the video
  // and drawing it into a canvas, then converting that to a PNG
  // format data URL. By drawing it on an offscreen canvas and then
  // drawing that to the screen, we can change its size and/or apply
  // other changes before drawing it.

  function takepicture() {
    const context = canvas.getContext("2d");
    if (width && height) {
      if (cropper) cropper.destroy();

      canvas.width = width;
      canvas.height = height;
      context.drawImage(video, 0, 0, width, height);

      const data = canvas.toDataURL("image/png");
      photo.setAttribute("src", data);
      photoData = data;

      cropper = new Cropper(photo, {
        aspectRatio,
        crop(event) {
          cropData = event.detail;
        },
      });

      document.getElementById("ph0").scrollIntoView(true);
    } else {
      clearphoto();
    }
  }

  // Set up our event listener to run the startup process
  // once loading is complete.
  window.addEventListener("load", startup, false);
})();
