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

// export async function getTopKClasses(logits, topK) {
//   const values = await logits.data();

//   const valuesAndIndices = [];
//   for (let i = 0; i < values.length; i++) {
//     valuesAndIndices.push({ value: values[i], index: i });
//   }
//   valuesAndIndices.sort((a, b) => {
//     return b.value - a.value;
//   });
//   const topkValues = new Float32Array(topK);
//   const topkIndices = new Int32Array(topK);
//   for (let i = 0; i < topK; i++) {
//     topkValues[i] = valuesAndIndices[i].value;
//     topkIndices[i] = valuesAndIndices[i].index;
//   }

//   const topClassesAndProbs = [];
//   for (let i = 0; i < topkIndices.length; i++) {
//     topClassesAndProbs.push({
//       className: IMAGENET_CLASSES[topkIndices[i]],
//       probability: topkValues[i],
//     });
//   }
//   return topClassesAndProbs;
// }
