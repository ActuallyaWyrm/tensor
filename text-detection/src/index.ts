/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
import * as tf from '@tensorflow/tfjs';

import {config} from './config';
import {QuantizationBytes, TextDetectionInput, TextDetectionOutput} from './types';
import {cropAndResize, detect} from './utils';

export {detect};
export const load = async (quantizationBytes: QuantizationBytes = 1) => {
  if (tf == null) {
    throw new Error(
        `Cannot find TensorFlow.js. ` +
        `If you are using a <script> tag, please ` +
        `also include @tensorflow/tfjs on the page before using this model.`);
  }

  if ([1, 2, 4].indexOf(quantizationBytes) === -1) {
    throw new Error(`Only quantization to 1, 2 and 4 bytes is supported.`);
  }
  const textDetection = new TextDetection(quantizationBytes);
  await textDetection.load();
  return textDetection;
};

export class TextDetection {
  private model: tf.GraphModel;
  private modelPath: string;
  private base = 'psenet';
  public constructor(quantizationBytes: QuantizationBytes = 1) {
    this.modelPath = `${config['BASE_PATH']}/${
        quantizationBytes ? `quantized/${quantizationBytes}/` :
                            ''}${this.base}/model.json`;
  }

  public async load() {
    this.model = await tf.loadGraphModel(this.modelPath);

    // Warm the model up.
    const processedInput =
        tf.tidy(() => this.preprocess(tf.zeros([100, 100, 3])));
    const result = await this.model.predict(processedInput) as tf.Tensor1D;
    await result.data();
    tf.dispose(result);
    tf.dispose(processedInput);
  }

  public preprocess(input: TextDetectionInput) {
    return tf.tidy(() => {
      return cropAndResize(input).expandDims(0);
    });
  }

  public async predict(input: TextDetectionInput):
      Promise<TextDetectionOutput> {
    const segmentationMaps = tf.tidy(() => {
      const processedInput = this.preprocess(input);
      return (this.model.predict(processedInput) as tf.Tensor4D).squeeze([0]) as
          tf.Tensor3D;
    });
    const boxes = detect(segmentationMaps);
    tf.dispose(segmentationMaps);
    return boxes;
  }

  /**
   * Dispose of the tensors allocated by the model.
   * You should call this when you are done with the model.
   */

  public async dispose() {
    if (this.model) {
      this.model.dispose();
    }
  }
}
