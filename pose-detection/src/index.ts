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

import {PoseDetector} from './pose_detector';
import {PosenetDetector} from './posenet/detector';
import {ModelConfig, SupportedModels} from './types';

/** Supported models. */
export {SupportedModels};

/**
 * Create a pose detector instance.
 *
 * @param model The name of the pipeline to load.
 */
export async function createDetector(
    model: SupportedModels,
    modelConfig: ModelConfig = {}): Promise<PoseDetector> {
  switch (model) {
    case SupportedModels.posenet:
      const detector = await PosenetDetector.load(modelConfig);
      return detector;
    default:
      throw new Error(`${model} is not a valid package name.`);
  }
}
