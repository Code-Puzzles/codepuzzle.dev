#!/bin/sh

set -euxo pipefail

temp_deps="tar xz bzip2"

yum install -y $temp_deps
yum install -y gtk3 alsa-lib dbus-glib

curl -L "https://download-installer.cdn.mozilla.net/pub/firefox/releases/${FIREFOX_VERSION}/linux-x86_64/en-US/firefox-${FIREFOX_VERSION}.tar.bz2" | tar -xj -C /opt
curl -L "https://github.com/mozilla/geckodriver/releases/download/v${GECKODRIVER_VERSION}/geckodriver-v${GECKODRIVER_VERSION}-linux64.tar.gz" | tar -xz -C /opt

yum remove -y $temp_deps
yum clean all
rm -rf /var/cache/yum
