cmake_minimum_required(VERSION 3.28)
project(bny_pbx_engine LANGUAGES C CXX)

find_package(Pj REQUIRED CONFIG)

add_executable(bny-pbx-engine pbx-engine.cpp)
target_compile_features(bny-pbx-engine PRIVATE cxx_std_17)
target_compile_definitions(bny-pbx-engine PRIVATE PJ_AUTOCONF=1)
target_link_libraries(bny-pbx-engine PRIVATE Pj::pjsua-lib)
set_target_properties(bny-pbx-engine PROPERTIES
  RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/out"
  RUNTIME_OUTPUT_DIRECTORY_RELEASE "${CMAKE_BINARY_DIR}/out"
)
