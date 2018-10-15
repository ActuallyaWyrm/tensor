/**
 * @license
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
import * as posenet from '@tensorflow-models/posenet';
import * as tf from '@tensorflow/tfjs';
import dat from 'dat.gui';
import Stats from 'stats.js';

import {drawKeypoints, drawSkeleton, partColors} from './demo_util';
import {applyBokehEffect} from './segmentation_demo_util';

const stats = new Stats();
const videoWidth = 640;
const videoHeight = 480;

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

function isiOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isMobile() {
  return isAndroid() || isiOS();
}

/**
 * Loads a the camera to be used in the demo
 *
 */
async function setupCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error(
        'Browser API navigator.mediaDevices.getUserMedia not available');
  }

  const video = document.getElementById('video');
  video.width = videoWidth;
  video.height = videoHeight;

  const mobile = isMobile();
  const stream = await navigator.mediaDevices.getUserMedia({
    'audio': false,
    'video': {
      facingMode: 'user',
      width: mobile ? undefined : videoWidth,
      height: mobile ? undefined : videoHeight,
    },
  });
  video.srcObject = stream;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

async function loadVideo() {
  const video = await setupCamera();
  video.play();

  return video;
}

const guiState = {
  estimate: 'segmentation',
  input:
      {mobileNetArchitecture: isMobile() ? '0.50' : '0.75', outputStride: 16},
  singlePoseDetection: {
    minPoseConfidence: 0.1,
    minPartConfidence: 0.5,
    segmentationThreshold: 0.5,
    showSkeleton: true,
    showPoints: true,
  },
  segmentation:
      {segmentationThreshold: 0.5, effect: 'mask', bokehBlurAmount: 3},
  partMap: {},
  net: null,
};


/**
 * Sets up a frames per second panel on the top-left of the window
 */
function setupFPS() {
  stats.showPanel(0);
  document.body.appendChild(stats.dom);
}

/**
 * Sets up dat.gui controller on the top-right of the window
 */
function setupGui(cameras, net) {
  guiState.net = net;

  if (cameras.length > 0) {
    guiState.camera = cameras[0].deviceId;
  }

  const gui = new dat.GUI({width: 300});

  // The single-pose algorithm is faster and simpler but requires only one
  // person to be in the frame or results will be innaccurate. Multi-pose works
  // for more than 1 person
  const estimateController =
      gui.add(guiState, 'estimate', ['single-pose', 'segmentation', 'partmap']);

  // The input parameters have the most effect on accuracy and speed of the
  // network
  let input = gui.addFolder('Input');
  // Architecture: there are a few PoseNet models varying in size and
  // accuracy. 1.00 is the largest, but will be the slowest. 0.50 is the
  // fastest, but least accurate.
  const architectureController = input.add(
      guiState.input, 'mobileNetArchitecture',
      ['1.00', '0.75', '0.50', '0.25']);
  // Output stride:  Internally, this parameter affects the height and width of
  // the layers in the neural network. The lower the value of the output stride
  // the higher the accuracy but slower the speed, the higher the value the
  // faster the speed but lower the accuracy.
  input.add(guiState.input, 'outputStride', [8, 16, 32]);

  input.open();

  // Pose confidence: the overall confidence in the estimation of a person's
  // pose (i.e. a person detected in a frame)
  // Min part confidence: the confidence that a particular estimated keypoint
  // position is accurate (i.e. the elbow's position)
  let single = gui.addFolder('Single Pose Detection');
  single.add(guiState.singlePoseDetection, 'minPoseConfidence', 0.0, 1.0);
  single.add(guiState.singlePoseDetection, 'minPartConfidence', 0.0, 1.0);
  single.add(guiState.singlePoseDetection, 'showSkeleton');
  single.add(guiState.singlePoseDetection, 'showPoints');
  single.close();

  let segmentation = gui.addFolder('Segmentation');
  segmentation.add(guiState.segmentation, 'segmentationThreshold', 0.0, 1.0);
  segmentation.add(guiState.segmentation, 'effect', ['mask', 'bokeh']);
  segmentation
      .add(
          guiState.segmentation,
          'bokehBlurAmount',
          )
      .min(1)
      .max(20)
      .step(1);
  segmentation.open();

  let partMap = gui.addFolder('Part Map');

  architectureController.onChange(function(architecture) {
    guiState.changeToArchitecture = architecture;
  });

  estimateController.onChange(function(estimationType) {
    if (estimationType === 'single-pose') {
      single.open();
      segmentation.close();
      partMap.close();
    } else if (estimationType === 'segmentation') {
      single.close();
      segmentation.open();
      partMap.close();
    } else {
      single.close();
      segmentation.open();
      partMap.open();
    }
  });
}

const segmentationDarkening = 0.25;
const partMapDarkening = 0.3;
async function drawSegmentation(canvas, video, segmentationMask) {
  const filteredImage = tf.tidy(() => {
    const invertedMask = tf.scalar(1, 'int32').sub(segmentationMask);
    const darkeningMask = invertedMask.cast('float32')
                              .mul(tf.scalar(segmentationDarkening))
                              .add(segmentationMask.cast('float32'));

    return video.cast('float32').mul(darkeningMask.expandDims(2)).cast('int32');
  });

  await tf.toPixels(filteredImage, canvas);

  filteredImage.dispose();
}

async function drawColoredPartHeatmap(canvas, video, coloredPartMap) {
  const filteredImage = tf.tidy(() => {
    const darkenedImage =
        video.cast('float32').mul(tf.scalar(partMapDarkening));

    return darkenedImage
        .add(
            coloredPartMap.cast('float32').mul(tf.scalar(1 - partMapDarkening)))
        .cast('int32');
  });

  await tf.toPixels(filteredImage, canvas);

  filteredImage.dispose();
}

function renderToCanvas(canvas, video) {
  const videoWidth = video.width;
  const videoHeight = video.height;
  const ctx = canvas.getContext('2d');

  canvas.width = videoWidth;
  canvas.height = videoHeight;
  ctx.clearRect(0, 0, videoWidth, videoHeight);
  ctx.save();
  ctx.scale(-1, 1);
  ctx.translate(-videoWidth, 0);
  ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
  ctx.restore();
}

/**
 * Sets up a frames per second panel on the top-left of the window
 */
function setupFPS() {
  stats.showPanel(0);  // 0: fps, 1: ms, 2: mb, 3+: custom
  document.body.appendChild(stats.dom);
}

/**
 * Feeds an image to posenet to estimate poses - this is where the magic
 * happens. This function loops with a requestAnimationFrame method.
 */
function detectPoseInRealTime(video, net) {
  const canvas = document.getElementById('output');
  const ctx = canvas.getContext('2d');
  // since images are being fed from a webcam
  const flipHorizontal = true;

  async function poseDetectionFrame() {
    if (guiState.changeToArchitecture) {
      // Important to purge variables and free up GPU memory
      guiState.net.dispose();

      // Load the PoseNet model weights for either the 0.50, 0.75, 1.00, or 1.01
      // version
      guiState.net =
          await posenet.loadSegmentation(+guiState.changeToArchitecture);

      guiState.changeToArchitecture = null;
    }

    // Begin monitoring code for frames per second
    stats.begin();

    // Scale an image down to a certain factor. Too large of an image will slow
    // down the GPU
    const outputStride = +guiState.input.outputStride;

    // renderToCanvas(canvas, video);

    switch (guiState.estimate) {
      case 'single-pose':
        const pose = await guiState.net.estimateSinglePose(
            video, flipHorizontal, outputStride);

        const minPoseConfidence =
            +guiState.singlePoseDetection.minPoseConfidence;
        const minPartConfidence =
            +guiState.singlePoseDetection.minPartConfidence;

        renderToCanvas(canvas, video);
        // For each pose (i.e. person) detected in an image, loop through the
        // poses and draw the resulting skeleton and keypoints if over certain
        // confidence scores
        const {score, keypoints} = pose;
        if (score >= minPoseConfidence) {
          if (guiState.singlePoseDetection.showPoints) {
            drawKeypoints(keypoints, minPartConfidence, ctx);
          }
          if (guiState.singlePoseDetection.showSkeleton) {
            drawSkeleton(keypoints, minPartConfidence, ctx);
          }
        }
        break;
      case 'segmentation':
        const personSegmentation =
            await guiState.net.estimatePersonSegmentation(
                video, flipHorizontal, outputStride,
                guiState.segmentation.segmentationThreshold);

        switch (guiState.segmentation.effect) {
          case 'mask':
            await posenet.maskAndDrawImageOnCanvas(
                canvas, video, personSegmentation);
            break;
          case 'bokeh':
            await applyBokehEffect(
                canvas, video, personSegmentation,
                +guiState.segmentation.bokehBlurAmount);
            break;
        }
        break;
      case 'partmap':
        const partSegmentation = await guiState.net.estimatePartSegmentation(
            video, flipHorizontal, outputStride,
            guiState.segmentation.segmentationThreshold);

        await posenet.drawColoredPartImageOnCanvas(
            canvas, video, partSegmentation, partColors);

        break;
      default:
        break;
    }

    // End monitoring code for frames per second
    stats.end();

    requestAnimationFrame(poseDetectionFrame);
  }

  poseDetectionFrame();
}

/**
 * Kicks off the demo by loading the posenet model, finding and loading
 * available camera devices, and setting off the detectPoseInRealTime function.
 */
export async function bindPage() {
  // Load the PoseNet model weights with architecture 0.75
  const net =
      await posenet.loadSegmentation(+guiState.input.mobileNetArchitecture);

  document.getElementById('loading').style.display = 'none';
  document.getElementById('main').style.display = 'block';

  let video;

  try {
    video = await loadVideo();
  } catch (e) {
    let info = document.getElementById('info');
    info.textContent = 'this browser does not support video capture,' +
        'or this device does not have a camera';
    info.style.display = 'block';
    throw e;
  }

  setupFPS();
  setupGui([], net);
  setupFPS();
  detectPoseInRealTime(video, net);
}

navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
// kick off the demo
bindPage();
