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

// import * as tf from '@tensorflow/tfjs';
// import {readFileSync} from 'fs';
// import {decode} from 'jpeg-js';
// import {resolve} from 'path';

// import {Point} from './geometry';
// import {minAreaRect} from './minAreaRect';
// import cv from './opencv';

describe('connectedComponents', () => {
  it('The connectedComponents output coincides with OpenCV.js on random input.',
     () => {
         // const input = tf.tidy(() => {
         //   const testImage =
         //       decode(readFileSync(resolve(__dirname,
         //       'assets/example.jpeg')), true);
         //   const rawData = tf.tensor(testImage.data, [
         //                       testImage.height, testImage.width, 4
         //                     ]).arraySync() as number[][][];
         //   const inputBuffer =
         //       tf.buffer([testImage.height, testImage.width], 'int32');
         //   for (let columnIndex = 0; columnIndex < testImage.height;
         //   ++columnIndex) {
         //     for (let rowIndex = 0; rowIndex < testImage.width; ++rowIndex) {
         //       for (let channel = 0; channel < 3; ++channel) {
         //         inputBuffer.set(
         //             rawData[columnIndex][rowIndex][channel], columnIndex,
         //             rowIndex);
         //       }
         //     }
         //   }

         //   return inputBuffer.toTensor();
         // }) as tf.Tensor2D;
         // const inputArray = input.arraySync();
         // const inputData = input.dataSync();
     });
});
