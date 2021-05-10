/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
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
import * as pose from '@mediapipe/pose';

import {BasePoseDetector, PoseDetector} from '../pose_detector';
import {Pose, PoseDetectorInput} from '../types';

import {BlazePoseMediaPipeEstimationConfig, BlazePoseMediaPipeModelConfig} from './types';

/**
 * MediaPipe detector class.
 */
export class BlazePoseMediaPipeDetector extends BasePoseDetector {
  private readonly poseSolution: pose.Pose;

  // This will be filled out by asynchronous calls to onResults. They will be
  // stable after `await send` is called on the pose solution.
  private width = 0;
  private height = 0;
  private poses: Pose[];

  private selfieMode = false;

  // Should not be called outside.
  private constructor(config: BlazePoseMediaPipeModelConfig) {
    super();
    this.poseSolution = new pose.Pose({
      locateFile: (path, base) => {
        if (config.solutionPath) {
          const solutionPath = config.solutionPath.replace(/\/+$/, '');
          return `${solutionPath}/${path}`;
        }
        return `${base}/${path}`;
      }
    });
    this.poseSolution.setOptions({
      modelComplexity: (config.lite ? 0 : 1),
      smoothLandmarks: config.enableSmoothing || true,
      selfieMode: this.selfieMode,
    });
    this.poseSolution.onResults((results) => {
      this.height = results.image.height;
      this.width = results.image.width;
      this.poses = this.translateOutputs(results);
    });
  }

  private translateOutputs(results: pose.Results): Pose[] {
    return [{
      keypoints: results.poseLandmarks.map(landmark => ({
                                             x: landmark.x * this.width,
                                             y: landmark.y * this.height,
                                             z: landmark.z,
                                             score: landmark.visibility
                                           }))
    }];
  }

  /**
   * Loads the MediaPipe solution.
   *
   * @param modelConfig ModelConfig dictionary that contains parameters for
   * the BlazePose loading process. Please find more details of each parameters
   * in the documentation of the `BlazePoseMediaPipeModelConfig` interface.
   */
  static async load(config: BlazePoseMediaPipeModelConfig):
      Promise<PoseDetector> {
    return new BlazePoseMediaPipeDetector(config);
  }

  /**
   * Estimates poses for an image or video frame.
   *
   * It returns a single pose or multiple poses based on the maxPose parameter
   * from the `config`.
   *
   * @param image
   * ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement The input
   * image to feed through the network.
   *
   * @param config Optional.
   *       maxPoses: Optional. Max number of poses to estimate.
   *       When maxPoses = 1, a single pose is detected, it is usually much more
   *       efficient than maxPoses > 1. When maxPoses > 1, multiple poses are
   *       detected.
   *
   *       flipHorizontal: Optional. Default to false. When image data comes
   *       from camera, the result has to flip horizontally.
   *
   *       enableSmoothing: Optional. Default to true. Smooth pose landmarks
   *       coordinates and visibility scores to reduce jitter.
   *
   * @param timestamp Optional. In microseconds, i.e. 1e-6 of a second. This is
   *     useful when image is a tensor, which doesn't have timestamp info. Or
   *     to override timestamp in a video.
   *
   * @return An array of `Pose`s.
   */
  async estimatePoses(
      image: PoseDetectorInput,
      estimationConfig: BlazePoseMediaPipeEstimationConfig,
      timestamp?: number): Promise<Pose[]> {
    if (estimationConfig &&
        (estimationConfig.flipHorizontal !== this.selfieMode)) {
      this.selfieMode = estimationConfig.flipHorizontal;
      this.poseSolution.setOptions({
        selfieMode: this.selfieMode,
      });
    }
    await this.poseSolution.send({image: image as pose.InputImage}, timestamp);
    return this.poses;
  }

  dispose() {
    this.poseSolution.close();
  }

  reset() {
    this.poseSolution.reset();
  }
}
