
var http = require('showtime/http');
var XML = require('showtime/xml');
var channel_name_bak = '';

(function(plugin){

    var PLUGIN_PREFIX = "shoutcast:";
    var SHOUTCAST_URL = "http://api.shoutcast.com"
    var SHOUTCAST_KEY = "sh1t7hyn3Kh0jhlV"
    var service = plugin.createService("shoutcast", PLUGIN_PREFIX + "start", "music", true, "shoutcast.bmp");

    plugin.addURI(PLUGIN_PREFIX + "start", function(page){ //获取分组

        page.appendItem(PLUGIN_PREFIX + 'channel_name:Top500', 'directory', {title: "Top500"});

        var url = SHOUTCAST_URL + "/genre/primary?k=" + SHOUTCAST_KEY + "&f=xml";
        var response_text = http.request(url, {
            headers: {
                "Host": "api.shoutcast.com",
                "Accept": "*/*"
            },
        }).toString();

        var response_data = XML.parse(response_text);
        var genre_data = response_data.response.data.genrelist.filterNodes('genre');

        //type: <genre name="Alternative" id="1" parentid="0" count="126" haschildren="true" />
        for(var i = 0; i < genre_data.length; i++) {
            var channel_name = genre_data[i]["@name"].replace("&amp;", "&");
            var metadata = {
                title: channel_name
            };

            page.appendItem(PLUGIN_PREFIX + 'channel_name:' + channel_name, 'directory', metadata);

        }
    });

    plugin.addURI(PLUGIN_PREFIX + "channel_name:(.*)", function(page, channel_name){ //获取某个分组下的节目

        var num_get_onetime = 16;
        var page_num = 0;
        var total = 0;

        if(channel_name !== channel_name_bak){
            total = 0;
        }

        function loader() {
            page_num++;

            var url = SHOUTCAST_URL;
            if(channel_name == "Top500"){
                url += "/legacy/Top500?k=" + SHOUTCAST_KEY + "&limit=" + (page_num-1) + "," + num_get_onetime;
            } else{
                var url_name = channel_name.replace(/ /g, "+").replace("&", "%26");
                url += "/legacy/genresearch?k=" + SHOUTCAST_KEY + "&genre=" + url_name + "&limit=" + (page_num-1) + "," + num_get_onetime;
                //print("\n\n-----" + url + "-----\n\n");
            }

            var response_text = http.request(url, {
                headers: {
                    "Host": "api.shoutcast.com",
                    "Accept": "*/*",
                },
            }).toString();

            var response_data = XML.parse(response_text);
            var station_data = response_data.stationlist.filterNodes('station');

            //<station name="Merry Christmas" mt="audio/mpeg" id="326912" br="128" genre="Kids" logo="http://i.radionomy.com/documents/radio/0/0e41/0e413e03-4586-47e5-be83-90600a51543d.s125.jpg" ct="Cyndi Lauper - December Child" lc="6756" />
            if(!(station_data.length)){
                return false;
            }

            total += station_data.length;

            for(var i = 0; i < station_data.length; i++) {
                //print(i + "\tstation_name: " + station_data[i]["@name"] + "\tstation_id: "   + station_data[i]["@id"] + "\tstation_logo: " + station_data[i]["@logo"]);

                var station_id = station_data[i]["@id"];
                if(!station_id) continue;
                var play_url = "http://yp.shoutcast.com/sbin/tunein-station.m3u?id=" + station_id;

                var metadata = {
                    title: station_data[i]["@name"],
                    icon: station_data[i]["@logo"],
                    extra_data: "total dynamic: " + total
                };

                page.appendItem(PLUGIN_PREFIX + "play_url:" + play_url, "video", metadata);
            }

            return true;
        }

        loader();
        page.paginator = loader;
    });

    plugin.addURI(PLUGIN_PREFIX + "play_url:(.*)", function(page, play_url){  //播放链接

        url = play_url + " -H \"User-Agent: VLC/2.2.0 LibVLC/2.2.0330\""
        var videoParams = {
            sources: [{
                url: url,
            }],
            no_subtitle_scan: true,
            subtitles: []
        }

        page.source = 'audioparams:' + JSON.stringify(videoParams);
    });

})(this);

