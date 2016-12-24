const Crawler = require("crawler");
const Config = require('config');
const _ = require('lodash');
const url = require('url');
const fs = require('fs');

let dataSet = [];

// 爬取列表
const listCrawler = new Crawler({
    maxConnections : 1,
    rateLimit:1000,
    callback : function (error, res, done) {
        if(error){
            console.error(error);
        }else {
            var $ = res.$;
            console.log($('title').text());


            // 下一页
            let nextPage= $('a.page-next')[0];
            if(nextPage!=null&&nextPage.attribs.href!=null){
                listCrawler.queue(url.resolve('http://www.dianping.com/member/683003727/wishlists',nextPage.attribs.href));
            }

            let titles = $('li div.txt div.tit h6 a');
            titles.each((index, title) => {
                if (title.attribs.href != null){
                    // infoCrawler.queue(url.resolve('http://www.dianping.com/',title.attribs.href ))
                    infoCrawler.queue('http://www.dianping.com/ajax/json/shop/wizard/BasicHideInfoAjaxFP?shopId='+title.attribs.href.replace('/shop/','') );
                }});
        }
        done();
    }
});

// 爬取详情
const infoCrawler = new Crawler({
    maxConnections : 5,
    rateLimit:1000,
    callback : function (error, res, done) {
        if(error){
            console.error(error);
        }else{
            try{
                let result = JSON.parse(res.body);
                let info = _.get(result,'msg.shopInfo');
                if(info !=null){
                    console.log('record',info.shopId, info.shopName)
                    dataSet.push([info.shopId, `${info.shopName}（${info.branchName}）`, info.cityId, info.avgPrice, info.shopPower, info.score, info.score1, info.score2, info.score3, info.shopType, info.address, info.crossRoad])
                }
            }catch  (e){
                console.error(e);
            }
        }
        done();
    }
});

// 开始爬第一页
listCrawler.queue(Config.get('wishlistURL'));

infoCrawler.on('drain', function () {
    const result = `
    <html>
<head>
    <title>Nano吃什么</title>
    <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/1.10.13/css/jquery.dataTables.min.css">
    <script type="text/javascript" language="javascript" src="http://code.jquery.com/jquery-1.12.4.js">
    </script>
    <script type="text/javascript" language="javascript" src="https://cdn.datatables.net/1.10.13/js/jquery.dataTables.min.js">
    </script>
    <script>
        var dataSet = ${JSON.stringify(dataSet)}
        $(document).ready(function() {
            $('#example').DataTable( {
                data: dataSet,
                columns: [
                    { title: "id" },
                    { title: "名称" },
                    { title: "城市" },
                    { title: "人均" },
                    { title: "评星" },
                    { title: "评分" },
                    { title: "口味" },
                    { title: "环境" },
                    { title: "服务" },
                    { title: "店铺类型" },
                    { title: "地址1" },
                    { title: "地址2" }
                ]
            } );
        } );
    </script>
</head>
<body>
<table id="example" class="display" width="100%"></table>
</body>
</html>
`;
    const fileName=`./report/${Date.now()}.html`;
    fs.writeFile(fileName, result, function (err) {
        if (err) return console.log(err);
        var open = require("open");
        open(fileName);
        // open('./example.html');
    });
});
