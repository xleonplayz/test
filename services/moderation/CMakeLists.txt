cmake_minimum_required(VERSION 3.16)
project(chat_moderation CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()

find_package(Threads REQUIRED)

add_library(moderation_core STATIC src/moderation.cpp src/json.cpp)
target_include_directories(moderation_core PUBLIC src)

add_executable(moderation src/main.cpp)
target_include_directories(moderation PRIVATE third_party)
target_link_libraries(moderation PRIVATE moderation_core Threads::Threads)

enable_testing()
add_executable(moderation_test src/moderation_test.cpp)
target_link_libraries(moderation_test PRIVATE moderation_core)
add_test(NAME moderation_test COMMAND moderation_test)
