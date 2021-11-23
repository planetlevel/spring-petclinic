#! /bin/sh

echo Installing Contrast into /opt/contrast

sudo curl -o /opt/contrast/contrast.jar -L https://repository.sonatype.org/service/local/artifact/maven/redirect?r=central-proxy\&g=com.contrastsecurity\&a=contrast-agent\&v=LATEST

