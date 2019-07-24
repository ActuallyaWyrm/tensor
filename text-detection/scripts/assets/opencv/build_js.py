#!/usr/bin/env python

# =============================================================================
# Copyright 2019 Google Inc. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# =============================================================================
# By downloading, copying, installing or using the software you agree to this license.
# If you do not agree to this license, do not download, install,
# copy or use the software.
#                           License Agreement
#                For Open Source Computer Vision Library
#                        (3-clause BSD License)
#
# Copyright (C) 2000-2019, Intel Corporation, all rights reserved.
# Copyright (C) 2009-2011, Willow Garage Inc., all rights reserved.
# Copyright (C) 2009-2016, NVIDIA Corporation, all rights reserved.
# Copyright (C) 2010-2013, Advanced Micro Devices, Inc., all rights reserved.
# Copyright (C) 2015-2016, OpenCV Foundation, all rights reserved.
# Copyright (C) 2015-2016, Itseez Inc., all rights reserved.
# Third party copyrights are property of their respective owners.
#
# Redistribution and use in source and binary forms, with or without modification,
# are permitted provided that the following conditions are met:
#
#   * Redistributions of source code must retain the above copyright notice,
#     this list of conditions and the following disclaimer.
#
#   * Redistributions in binary form must reproduce the above copyright notice,
#     this list of conditions and the following disclaimer in the documentation
#     and/or other materials provided with the distribution.
#
#   * Neither the names of the copyright holders nor the names of the contributors
#     may be used to endorse or promote products derived from this software
#     without specific prior written permission.
#
# This software is provided by the copyright holders and contributors "as is" and
# any express or implied warranties, including, but not limited to, the implied
# warranties of merchantability and fitness for a particular purpose are disclaimed.
# In no event shall copyright holders or contributors be liable for any direct,
# indirect, incidental, special, exemplary, or consequential damages
# (including, but not limited to, procurement of substitute goods or services;
# loss of use, data, or profits; or business interruption) however caused
# and on any theory of liability, whether in contract, strict liability,
# or tort (including negligence or otherwise) arising in any way out of
# the use of this software, even if advised of the possibility of such damage.

import argparse
import glob
import logging as log
import multiprocessing
import os
import re
import shutil
import subprocess
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


class Fail(Exception):
    def __init__(self, text=None):
        self.t = text

    def __str__(self):
        return "ERROR" if self.t is None else self.t


def execute(cmd, shell=False):
    try:
        log.info("Executing: %s" % cmd)
        env = os.environ.copy()
        env["VERBOSE"] = "1"
        retcode = subprocess.call(cmd, shell=shell, env=env)
        if retcode < 0:
            raise Fail("Child was terminated by signal: %s" % -retcode)
        elif retcode > 0:
            raise Fail("Child returned: %s" % retcode)
    except OSError as e:
        raise Fail("Execution failed: %d / %s" % (e.errno, e.strerror))


def rm_one(d):
    d = os.path.abspath(d)
    if os.path.exists(d):
        if os.path.isdir(d):
            log.info("Removing dir: %s", d)
            shutil.rmtree(d)
        elif os.path.isfile(d):
            log.info("Removing file: %s", d)
            os.remove(d)


def check_dir(d, create=False, clean=False):
    d = os.path.abspath(d)
    log.info("Check dir %s (create: %s, clean: %s)", d, create, clean)
    if os.path.exists(d):
        if not os.path.isdir(d):
            raise Fail("Not a directory: %s" % d)
        if clean:
            for x in glob.glob(os.path.join(d, "*")):
                rm_one(x)
    else:
        if create:
            os.makedirs(d)
    return d


def check_file(d):
    d = os.path.abspath(d)
    if os.path.exists(d):
        if os.path.isfile(d):
            return True
        else:
            return False
    return False


def find_file(name, path):
    for root, dirs, files in os.walk(path):
        if name in files:
            return os.path.join(root, name)


class Builder:
    def __init__(self, options):
        self.options = options
        self.build_dir = check_dir(options.build_dir, create=True)
        self.opencv_dir = check_dir(options.opencv_dir)
        self.emscripten_dir = check_dir(options.emscripten_dir)

    def get_toolchain_file(self):
        return os.path.join(
            self.emscripten_dir, "cmake", "Modules", "Platform", "Emscripten.cmake"
        )

    def clean_build_dir(self):
        for d in ["CMakeCache.txt", "CMakeFiles/", "bin/", "libs/", "lib/", "modules"]:
            rm_one(d)

    def get_cmake_cmd(self):
        cmd = [
            "cmake",
            "-DCMAKE_BUILD_TYPE=Release",
            "-DCMAKE_TOOLCHAIN_FILE='%s'" % self.get_toolchain_file(),
            "-DCPU_BASELINE=''",
            "-DCPU_DISPATCH=''",
            "-DCV_TRACE=OFF",
            "-DBUILD_SHARED_LIBS=OFF",
            "-DWITH_1394=OFF",
            "-DWITH_ADE=OFF",
            "-DWITH_VTK=OFF",
            "-DWITH_EIGEN=OFF",
            "-DWITH_FFMPEG=OFF",
            "-DWITH_GSTREAMER=OFF",
            "-DWITH_GTK=OFF",
            "-DWITH_GTK_2_X=OFF",
            "-DWITH_IPP=OFF",
            "-DWITH_JASPER=OFF",
            "-DWITH_JPEG=OFF",
            "-DWITH_WEBP=OFF",
            "-DWITH_OPENEXR=OFF",
            "-DWITH_OPENGL=OFF",
            "-DWITH_OPENVX=OFF",
            "-DWITH_OPENNI=OFF",
            "-DWITH_OPENNI2=OFF",
            "-DWITH_PNG=OFF",
            "-DWITH_TBB=OFF",
            "-DWITH_PTHREADS_PF=OFF",
            "-DWITH_TIFF=OFF",
            "-DWITH_V4L=OFF",
            "-DWITH_OPENCL=OFF",
            "-DWITH_OPENCL_SVM=OFF",
            "-DWITH_OPENCLAMDFFT=OFF",
            "-DWITH_OPENCLAMDBLAS=OFF",
            "-DWITH_GPHOTO2=OFF",
            "-DWITH_LAPACK=OFF",
            "-DWITH_ITT=OFF",
            "-DWITH_QUIRC=OFF",
            "-DBUILD_ZLIB=ON",
            "-DBUILD_opencv_apps=OFF",
            "-DBUILD_opencv_calib3d=ON",
            "-DBUILD_opencv_dnn=ON",
            "-DBUILD_opencv_features2d=ON",
            "-DBUILD_opencv_flann=ON",  # No bindings provided. This module is used as a dependency for other modules.
            "-DBUILD_opencv_gapi=OFF",
            "-DBUILD_opencv_ml=OFF",
            "-DBUILD_opencv_photo=ON",
            "-DBUILD_opencv_imgcodecs=OFF",
            "-DBUILD_opencv_shape=OFF",
            "-DBUILD_opencv_videoio=OFF",
            "-DBUILD_opencv_videostab=OFF",
            "-DBUILD_opencv_highgui=OFF",
            "-DBUILD_opencv_superres=OFF",
            "-DBUILD_opencv_stitching=OFF",
            "-DBUILD_opencv_java=OFF",
            "-DBUILD_opencv_java_bindings_generator=OFF",
            "-DBUILD_opencv_js=ON",
            "-DBUILD_opencv_python2=OFF",
            "-DBUILD_opencv_python3=OFF",
            "-DBUILD_opencv_python_bindings_generator=OFF",
            "-DBUILD_EXAMPLES=OFF",
            "-DBUILD_PACKAGE=OFF",
            "-DBUILD_TESTS=OFF",
            "-DBUILD_PERF_TESTS=OFF",
        ]
        if self.options.build_doc:
            cmd.append("-DBUILD_DOCS=ON")
        else:
            cmd.append("-DBUILD_DOCS=OFF")

        flags = self.get_build_flags()
        if flags:
            cmd += ["-DCMAKE_C_FLAGS='%s'" % flags, "-DCMAKE_CXX_FLAGS='%s'" % flags]
        return cmd

    def get_build_flags(self):
        flags = ""
        flags += "-s USE_PTHREADS=0 "
        if self.options.build_wasm:
            flags += "-s WASM=1 "
        elif self.options.disable_wasm:
            flags += "-s WASM=0 "
        if self.options.enable_exception:
            flags += "-s DISABLE_EXCEPTION_CATCHING=0 "
        return flags

    def config(self):
        cmd = self.get_cmake_cmd()
        cmd.append(self.opencv_dir)
        execute(cmd)

    def build_opencvjs(self):
        execute(["make", "-j", str(multiprocessing.cpu_count()), "opencv.js"])

    def build_test(self):
        execute(["make", "-j", str(multiprocessing.cpu_count()), "opencv_js_test"])

    def build_doc(self):
        execute(["make", "-j", str(multiprocessing.cpu_count()), "doxygen"])


# ===================================================================================================

if __name__ == "__main__":
    opencv_dir = os.path.abspath(os.path.join(SCRIPT_DIR, "../.."))
    emscripten_dir = None
    if "EMSCRIPTEN" in os.environ:
        emscripten_dir = os.environ["EMSCRIPTEN"]

    parser = argparse.ArgumentParser(description="Build OpenCV.js by Emscripten")
    parser.add_argument("build_dir", help="Building directory (and output)")
    parser.add_argument(
        "--opencv_dir",
        default=opencv_dir,
        help='Opencv source directory (default is "../.." relative to script location)',
    )
    parser.add_argument(
        "--emscripten_dir",
        default=emscripten_dir,
        help="Path to Emscripten to use for build",
    )
    parser.add_argument(
        "--build_wasm",
        action="store_true",
        help="Build OpenCV.js in WebAssembly format",
    )
    parser.add_argument(
        "--disable_wasm", action="store_true", help="Build OpenCV.js in Asm.js format"
    )
    parser.add_argument("--build_test", action="store_true", help="Build tests")
    parser.add_argument("--build_doc", action="store_true", help="Build tutorials")
    parser.add_argument(
        "--clean_build_dir", action="store_true", help="Clean build dir"
    )
    parser.add_argument("--skip_config", action="store_true", help="Skip cmake config")
    parser.add_argument(
        "--config_only", action="store_true", help="Only do cmake config"
    )
    parser.add_argument(
        "--enable_exception", action="store_true", help="Enable exception handling"
    )
    args = parser.parse_args()

    log.basicConfig(format="%(message)s", level=log.DEBUG)
    log.debug("Args: %s", args)

    if args.emscripten_dir is None:
        log.info(
            "Cannot get Emscripten path, please specify it either by EMSCRIPTEN environment variable or --emscripten_dir option."
        )
        sys.exit(-1)

    builder = Builder(args)

    os.chdir(builder.build_dir)

    if args.clean_build_dir:
        log.info("=====")
        log.info("===== Clean build dir %s", builder.build_dir)
        log.info("=====")
        builder.clean_build_dir()

    if not args.skip_config:
        target = "default target"
        if args.build_wasm:
            target = "wasm"
        elif args.disable_wasm:
            target = "asm.js"
        log.info("=====")
        log.info("===== Config OpenCV.js build for %s" % target)
        log.info("=====")
        builder.config()

    if args.config_only:
        sys.exit(0)

    log.info("=====")
    log.info("===== Building OpenCV.js")
    log.info("=====")
    builder.build_opencvjs()

    if args.build_test:
        log.info("=====")
        log.info("===== Building OpenCV.js tests")
        log.info("=====")
        builder.build_test()

    if args.build_doc:
        log.info("=====")
        log.info("===== Building OpenCV.js tutorials")
        log.info("=====")
        builder.build_doc()

    log.info("=====")
    log.info("===== Build finished")
    log.info("=====")

    opencvjs_path = os.path.join(builder.build_dir, "bin", "opencv.js")
    if check_file(opencvjs_path):
        log.info("OpenCV.js location: %s", opencvjs_path)

    if args.build_test:
        opencvjs_test_path = os.path.join(builder.build_dir, "bin", "tests.html")
        if check_file(opencvjs_test_path):
            log.info("OpenCV.js tests location: %s", opencvjs_test_path)

    if args.build_doc:
        opencvjs_tutorial_path = find_file(
            "tutorial_js_root.html",
            os.path.join(builder.build_dir, "doc", "doxygen", "html"),
        )
        if check_file(opencvjs_tutorial_path):
            log.info("OpenCV.js tutorials location: %s", opencvjs_tutorial_path)
