#! /bin/bash

DEV_PID=0
TEST_PID=0
PROD_PID=0

trap shutdown SIGINT

shutdown() {
  echo
  echo killing $DEV_PID
  kill $DEV_PID > /dev/null &
  echo killing $TEST_PID
  kill $TEST_PID > /dev/null &
  echo killing $PROD_PID
  kill $PROD_PID > /dev/null &
  echo servers terminated
  exit 0
}

echo starting DEV server on port 8000
export JAVA_TOOL_OPTIONS="-javaagent:/opt/contrast/contrast.jar -Dcontrast.config.path=/opt/contrast/contrast.yaml -Dserver.port=8000"
java -jar target/spring-petclinic-1.5.1.jar &> /dev/null &
DEV_PID=$!
echo -ne '#####                     (33%)\r'
sleep 3
echo -ne '#############             (66%)\r'
sleep 3
echo -ne '#######################   (100%)\r'
echo -ne '\n'
echo

echo starting TEST server on port 8010
export JAVA_TOOL_OPTIONS="-javaagent:/opt/contrast/contrast.jar -Dcontrast.config.path=/opt/contrast/contrast_test.yaml -Dserver.port=8010"
java -jar target/spring-petclinic-1.5.1.jar &> /dev/null &
TEST_PID=$!
echo -ne '#####                     (33%)\r'
sleep 3
echo -ne '#############             (66%)\r'
sleep 3
echo -ne '#######################   (100%)\r'
echo -ne '\n'
echo

echo starting PROD server on port 8020
export JAVA_TOOL_OPTIONS="-javaagent:/opt/contrast/contrast.jar -Dcontrast.config.path=/opt/contrast/contrast_protect.yaml -Dserver.port=8020"
java -jar target/spring-petclinic-1.5.1.jar &> /dev/null &
PROD_PID=$!
echo -ne '#####                     (33%)\r'
sleep 3
echo -ne '#############             (66%)\r'
sleep 3
echo -ne '#######################   (100%)\r'
echo -ne '\n'
echo

echo "Press [CTRL+C] to stop..."
while :
do
  sleep 1
done
