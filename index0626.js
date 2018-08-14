// import module
var restify = require('restify');
var builder = require('botbuilder');

var menu = require('./menuConfig.json');
var mainMenu = menu.main ;
var painChart = menu.pain ;
var blisterpic = menu.blister;
var timeQuiz = menu.timequiz;
var infoMenu = menu.info;
var bankfunc = menu.bankfunc;
//由config 資料夾內的default.json 抓取 appID appPassword(Azure)
const
    // restify = require('restify'),
    plugins = require('restify-plugins'),
    config = require('config'),
    // builder = require('botbuilder'),
    apiAIRecognizer = require('api-ai-recognizer'),
    request = require('request');

const APP_ID = config.get('appID');          //input your app_id
const APP_PASSWORD = config.get('appPassword');    //input your app_PWD


// 本地測試用
// var recognizer = new apiAIRecognizer(DIALOGFLOW_CLIENT_ACCESS_TOKEN);
// var intents = new builder.IntentDialog({
//     recognizers:[recognizer]
// });


/////////////////////////////////////////////////////////////////////////////
// Setup Web Server
var server = restify.createServer();
// 接微軟給的port 指定給 PORT
server.listen(process.env.port || process.env.PORT || "3978" , function(){
    console.log('%s listening to %s',server.name, server.url);
});

// Create chat connector for communication with the Bot Framework Server
// 雲端自動生成帳密存入變數
var connector = new builder.ChatConnector({
    // appId : process.env.MicrosoftAppId,
    // appPassword : process.env.MicrosoftAppPassword,
    appId: APP_ID,
    appPassword: APP_PASSWORD
});

// Listen for messages from users
server.post('/api/messages', connector.listen());
// Default dialog
var inMemoryStorage = new builder.MemoryBotStorage();
var bot = new builder.UniversalBot(connector, [
    function(session){
        session.send("您好，我是杯麵，您的個人保健小幫手。");
        session.replaceDialog('mainMenu');
    }
]).set('storage', inMemoryStorage);

// var bot = new builder.UniversalBot(connector, [
//     function(session){
//         session.send("您好，我是杯麵，您的個人保健小幫手。");
//         session.replaceDialog('mainMenu');
//     }
// ])


// MainMenu 連接menuConfig.json  var mainMenu = menu.main 匯入 快速問診、生理量測、相關資訊item
bot.dialog('mainMenu',[
    function(session){
        builder.Prompts.choice(session,"請問你需要什麼服務?", mainMenu,{listStyle:builder.ListStyle.button});
    },
    function(session, results){
        session.beginDialog(mainMenu[results.response.entity]);    
    },
    function(session, results){
        output = results.response
        if (output.item == "inquiry"){
            var inquiry=output;
            console.log(inquiry)
            Calculatescore(inquiry, session)

            // 過去aaa的dialog
            // session.send("你好，開始上傳圖片的dialog");
            session.send("請幫我上傳一張圖片，我再幫您仔細判斷一下是否為腸病毒");
            session.beginDialog('aaa');
        }else if (output.item == "health"){
            var health=output.createdata;
            var health_date = health.Date
            var healthdate = health.Date.slice(0,10);
            var height =health.height/100
            var BMI = health.weight/(height*height)
            session.send("===您輸入的生理量測值===\n\n量測日期:"+healthdate+"\n\n身份證字號："+health.ID+"\n\n收縮壓："+health.systolic+" mmHg\n\n舒張壓："+health.diastolic+" mmHg\n\n體重、身高："+health.weight+"公斤、"+health.height+"公分\n\nBMI："+BMI+" 公斤/平方公尺\n\n腰圍："+health.waist+"公分");
            var option ={
                method:"POST",
                url: "http://e8fcc9c6.ngrok.io/api/healthbank/?format=json",
                headers:{"Content-Type":"application/json"},
                body:{"userID":health.ID,
                    "health_date":health_date,
                    "health_systolic":health.systolic,
                    "health_diastolic":health.diastolic,
                    "health_heartbeat":health.heartbeat,
                    "health_weight":health.weight,
                    "health_height":health.height,
                    "BMI":BMI,
                    "health_waist":health.waist
                    },
                    json:true
                }
            request(option, function(error, response, body){
                console.log("[Status Code]:"+response.statusCode);
                if (!error && response.statusCode == 201){
                    session.send("你的生理量測已上傳完成!")
                }
                else{
                    console.log("[Request Error]:"+error);
                }
                session.endConversation();
                session.replaceDialog("mainMenu"); 
            });
            // session.replaceDialog('mainMenu');
        }
        else{session.replaceDialog('mainMenu');}         
    }
]).triggerAction({matches:/^回主選單$/});

// inquiryMenu 腸病毒快速問診dialog
bot.dialog('inquiryMenu',[
    function(session){
        session.dialogData.inquiry={item:"inquiry"};   //初始化

        builder.Prompts.number(session,"我聽到你不舒服（ ●—● ）。1～10分，請問你的疼痛指數是多少？");
        var msg = new builder.Message(session); //建立一個msg物件
        var heroCard = new builder.HeroCard(session)  //建立一個herocard
            .title(painChart.title)
            .subtitle(painChart.subtitle)
            .images([builder.CardImage.create(session,painChart.picture)])
            
        msg.addAttachment(heroCard);    //addAttachment只能放一個msg物件
        session.send(msg);
    },
    function(session, results){
        session.dialogData.inquiry.pain = results.response;
        builder.Prompts.choice(session,"請問你的年齡層為?","3歲以下|4~5歲|6歲~18歲|19~65歲|65歲以上",{listStyle:builder.ListStyle.button});
    },
    function(session, results){
        session.dialogData.inquiry.ages = results.response.entity;
        builder.Prompts.choice(session,"請問你過去是否有罹患過腸病毒?","有|無",{listStyle:builder.ListStyle.button});
    },
    function(session, results){
        session.dialogData.inquiry.history = results.response.entity;
        builder.Prompts.choice(session,"請問你最近3天內是否有接觸過罹患腸病毒或流感的人?\n\n如：家庭、幼稚園、學校、工作環境...等","是，僅有接觸過流感患者|是，僅有接觸過腸病毒患者|是，兩者皆有接觸過|否，皆沒有接觸過",{listStyle:builder.ListStyle.button});
    },
    function(session, results){
        session.dialogData.inquiry.contact = results.response.entity;
        builder.Prompts.choice(session,"請問你是否有『發燒』症狀?\n\n腋溫大於37℃、耳溫大於38℃、口溫大於37.5℃","是|否",{listStyle:builder.ListStyle.button});
    },
    function(session,results, next){
        session.dialogData.inquiry.fever = results.response.entity;
        if (session.dialogData.inquiry.fever == "是"){
            session.beginDialog('fevertime') 
        }else{
            next()
        }              
    },
    function(session,results){
        if (results.response){
            session.dialogData.inquiry.fevertime = results.response;
        }else{
            session.dialogData.inquiry.fevertime = ""
        }
        
        builder.Prompts.choice(session,"請問你是否有『持續嘔吐』症狀?\n\n即使沒有吃東西也一直乾嘔。發燒時吐 1~2 次不是持續嘔吐。","是|否",{listStyle:builder.ListStyle.button});
    },
    function(session,results, next){
        session.dialogData.inquiry.vomiting = results.response.entity;
        if (session.dialogData.inquiry.vomiting == "是"){
            session.beginDialog('vomitingtime')
        }else{
            next()
        }       
    },
    function(session,results){
        if (results.response){
            session.dialogData.inquiry.vomitingtime = results.response.entity;
        }else{
            session.dialogData.inquiry.vomitingtime = ""
        }
        
        builder.Prompts.choice(session,"請問你是否有『呼吸急促或心跳加快』情況?\n\n心跳120次/分以上。呼吸速率30次/分以上","是|否",{listStyle:builder.ListStyle.button});
    },
    function(session,results){
        session.dialogData.inquiry.rapidHeartbeat = results.response.entity;
        builder.Prompts.choice(session,"請問你是否有『嗜睡』情況?\n\n意識不清、眼神呆滯或疲倦無力","是|否",{listStyle:builder.ListStyle.button});
    },
    function(session,results){
        session.dialogData.inquiry.lethargy = results.response.entity;
        builder.Prompts.choice(session,"請問你是否有『肌躍型抽搐』情況?\n\n無故驚嚇或忽然間全身肌肉收縮","是|否",{listStyle:builder.ListStyle.button});
    },
    function(session,results){
        session.dialogData.inquiry.myoclonicjerk = results.response.entity;
        var msg = new builder.Message(session); //建立一個msg物件
        var heroCard = new builder.HeroCard(session)  //建立一個herocard
            .title(blisterpic.title)
            .subtitle(blisterpic.subtitle)
            .text(blisterpic.text)
            .images([builder.CardImage.create(session,blisterpic.picture)])
            
        msg.addAttachment(heroCard);    //addAttachment只能放一個msg物件
        session.send(msg);

        builder.Prompts.choice(session,"請問你是否有出現『紅疹、水泡』情況?\n\n類似上圖所示之情況","是|否",{listStyle:builder.ListStyle.button});
    },
    function(session,results){
        session.dialogData.inquiry.blister=results.response.entity;
        session.endDialogWithResult({
            response:session.dialogData.inquiry
        });
        // session.endDialog('mainMenu');
    }
]).triggerAction({matches:/^腸病毒$/});
// fevertime 如有發燒細項問題
bot.dialog('fevertime',[
    function(session){
        session.dialogData.fevertime = {};
        builder.Prompts.choice(session,"請問『發燒』症狀困擾你多久了?",timeQuiz,{listStyle:builder.ListStyle.button});
    },
    function(session,results){
        session.dialogData.fevertime.fevertime = results.response.entity;
        builder.Prompts.choice(session,"請問你『發燒情況』如何?","達40度以上|未達40度",{listStyle:builder.ListStyle.button});
    },
    function(session,results){
        session.dialogData.fevertime.degree = results.response.entity;
        builder.Prompts.choice(session,"請問你是否『有使用退燒藥』以及『退燒效果』如何?","是，有使用，已退燒|是，有使用，退燒後又復燒|是，有使用，沒退燒|否，沒使用",{listStyle:builder.ListStyle.button});
    },
    function(session, results){
        session.dialogData.fevertime.antipyretic = results.response.entity;
        session.endDialogWithResult({
            response:session.dialogData.fevertime
        });
    }
]);
// vomitingtime 如有嘔吐細項問題
bot.dialog('vomitingtime',[    
    function(session){
        session.dialogData.vomitingtime = {};
        builder.Prompts.choice(session,"請問『嘔吐』症狀困擾你多久了?",timeQuiz,{listStyle:builder.ListStyle.button});
    },
    function(session, results){
        session.dialogData.vomitingtime = results.response
        session.endDialogWithResult({
            response:session.dialogData.vomitingtime
        });
    }
]);
// healthMenu 新增、查詢生理量測dialog
bot.dialog('healthMenu',[
    function(session){
        session.dialogData.health = {item:"health"} ;   //初始化，不然會 undefined
        builder.Prompts.choice(session,"請問針對你生理量測數據要進行下列哪一項動作?",bankfunc,{listStyle:builder.ListStyle.button});
    },
    function(session, results){
        session.beginDialog(bankfunc[results.response.entity]);    
    },
    function(session,results){
        session.dialogData.health.createdata=results.response;
        session.endDialogWithResult({
            response:session.dialogData.health
        });
    }
]).triggerAction({matches:/^健康存摺-生理量測$/});

// createdata 新增生理量測細項問題
bot.dialog('createdata',[
    function(session){
        session.dialogData.health = {} ;   //初始化，不然會 undefined
        builder.Prompts.time(session,"請問量測日期為?");
    },
    function(session,results){
        //利用chrono套件去解析日期/時間，chrono是一款自然語言datatime解析器，支援中文
        var MeasuringDate =results.response;
        session.dialogData.health.Date = builder.EntityRecognizer.resolveTime([MeasuringDate]) ; 
        builder.Prompts.text(session,`請問你的身分證字號為?`);
    },
    function(session,results){
        session.dialogData.health.ID=results.response;
        builder.Prompts.number(session,`請問你的『收縮壓』量測值?\n\n單位:mmHg、參考值: <120`);
    },
    function(session,results){
        session.dialogData.health.systolic=results.response;
        builder.Prompts.number(session,`請問你的『舒張壓』量測值?\n\n單位:mmHg、參考值: <80`);
    },
    function(session,results){
        session.dialogData.health.diastolic=results.response;
        builder.Prompts.number(session,`請問你的『心率(心跳數)』量測值?\n\n單位:次/分鐘、參考值: 60~100`);
    },
    function(session,results){
        session.dialogData.health.heartbeat=results.response;
        builder.Prompts.number(session,`請問你的『體重』量測值?\n\n單位:公斤、參考值: --`);
    },
    function(session,results){
        session.dialogData.health.weight=results.response;
        builder.Prompts.number(session,`請問你的『身高』量測值?\n\n單位:公分、參考值: --`);
    },
    function(session,results){
        session.dialogData.health.height=results.response;
        builder.Prompts.number(session,`請問你的『腰圍』量測值?\n\n單位:公分、參考值: --`);
    },
    function(session,results){
        session.dialogData.health.waist=results.response;
        session.endDialogWithResult({
            response:session.dialogData.health
        });
    }
]);
// checkdata 查詢生理量測細項問題
bot.dialog('checkdata',[
    function(session){
        session.dialogData.healthcheck = { } ; //初始化，不然會 undefined
        builder.Prompts.text(session,`請提供您的身分證字號，方便我查詢你的生理量測資料`);
    },function(session,results){
        session.dialogData.healthcheck.userID = results.response; ;   
        builder.Prompts.time(session,"請問您要查詢生理量測的日期為?");
    },
    function(session,results){
        //利用chrono套件去解析日期/時間，chrono是一款自然語言datatime解析器，支援中文
        var cDate =results.response;
        checkdate = builder.EntityRecognizer.resolveTime([cDate]) ;
        test = checkdate.toJSON()
        var datearray = new Array ;
        datearray.push(test)
        var checkdate = datearray[0].slice(0,10)

        var userID=session.dialogData.healthcheck.userID;
        
        var option ={
            method:"GET",
            url: "http://e8fcc9c6.ngrok.io/api/healthbank/?format=json",
            headers:{"Content-Type":"application/json"},
            }
        request(option, function(error, response, body){
            // console.log("[Status Code]:"+response.statusCode);
            var bank_all = JSON.parse(body) ;
            if (!error && response.statusCode == 200){
                var outData =[];
                for (var x in bank_all){
                    var health_date =bank_all[x].health_date.slice(0,10)
                    if((checkdate == health_date) & (bank_all[x].userID == userID)){
                        outData.push(bank_all[x])
                    }
                }
            }
            else{
                console.log("[Request Error]:"+error);                
            }
                  
            if (outData.length>0){           
                session.send(`你查詢的資料如下:\n\n量測日期：${checkdate}\n\n收縮壓：${outData[0].health_systolic} mmHg\n\n舒張壓：${outData[0].health_diastolic} mmHg\n\n心率(心跳數)：${outData[0].health_heartbeat} 次/分鐘\n\n體重、身高：${outData[0].health_weight}公斤、${outData[0].health_height}公分\n\nBMI：${outData[0].BMI} 公斤/平方公尺\n\n腰圍：${outData[0].health_waist}公分\n\n`);
            }else{
                session.send('查無資料喔~');
            }
            session.endConversation();
            session.replaceDialog("mainMenu");          
        });
        // session.endConversation();
        // session.replaceDialog("mainMenu");
        }   
]);

// 上傳圖片利用 Custom Vision 進行圖片分析
bot.dialog('aaa',[
    function(session, results){       
        var msg = session.message;
        if (msg.attachments && msg.attachments.length > 0) {
        // Echo back attachment
        var attachment = msg.attachments[0];
            session.send("稍等一下，馬上為您進行分析...");
            ///////////////////////////////
            console.log(attachment.contentUrl)
            request({
                uri: "https://southcentralus.api.cognitive.microsoft.com/customvision/v2.0/Prediction/3fcfb63b-137e-41e7-a864-61d3367877a0/url?iterationId=61b0ce83-20d1-455a-88e5-a4907ce21727",// INPUT YOUR CUSTOM VISION API URL HERE
                json:true,
                method:"POST",
                headers:{"Prediction-Key":"22630c290222442181f4ec6802990d18", // INPUT YOUR KEY HERE
                         "Content-Type":"application/json"},
                body:{"Url":attachment.contentUrl}
                // body:{"Url":"http://a.ecimg.tw/items/DBAB01A05738870/000001_1520820703.jpg"}   //這樣成功    
                // Set Body to : {"Url": "https://example.com/image.png"}
             
            },function(error, response, body){
                if(!error && response.statusCode == 200){
                    // session.send("稍等一下，馬上為您進行分析...");
                    var thesePredictions = response.body.predictions;
                    for(var x in thesePredictions)
                    {
                        if(thesePredictions[x].tagName == "Enterovirus")
                        {
                            if(thesePredictions[x].probability >= 0.7)
                            {
                                session.send("我覺得情況不太樂觀，您疑似患有腸病毒! (%s)",thesePredictions[x].probability);
                            }else
                            {
                                session.send("我判斷的結果，這應該不是腸病毒 (%s)",thesePredictions[x].probability);
                            }
                            session.beginDialog('choice')  // 寫在這，如果使用者沒上傳圖片，應該會卡
                        }
                    }
                }else{
                    session.send("[MS Congnitive Service] failed");
                    session.send(error,response.statusCode);
                    console.log(error,response.statusCode)
                }
            });
            // session.replaceDialog('mainMenu')
            // session.beginDialog('shipment')   // 可以跑          
        } else {
            // Echo back users text
            // session.send("You said: %s", session.message.text);
            console.log()
        } 
        // session.replaceDialog('mainMenu')  //失敗的位置     
    },
    // session.replaceDialog('mainMenu')  //失敗
])

// 是否預約的對話 
bot.dialog('choice',[
    function (session){  //裡面沒有用到results.response，所以不用加results
        session.dialogData.shipment = {};
        builder.Prompts.choice(session,"需要幫您預約掛號嗎?","好的!請幫我預約|我不用預約",{listStyle:builder.ListStyle.button});  // builder.Prompts.XXX (各個不同的方法)
    },
    function (session,results, next){
        session.dialogData.shipment.yesorno =results.response.entity;
        // yesorno = session.dialogData.shipment.yesorno
        if(session.dialogData.shipment.yesorno == "我不用預約"){
            session.beginDialog('mainMenu')
        }
        else{         
            next()
        }          
    },
    function (session){  //裡面沒有用到results.response，所以不用加results
        builder.Prompts.text(session,"請問您的姓名?");        
    },
    function (session,results){
        session.dialogData.shipment.customer =results.response;
        builder.Prompts.text(session,"請問您的連絡電話?");
    },
    function (session,results){
        session.dialogData.shipment.telephone =results.response;
        builder.Prompts.choice(session,"請問您目前所住的區域為?","新莊區|林口區|五股區|蘆洲區|三重區|泰山區|新店區|石碇區|深坑區|坪林區|烏來區|板橋區|三峽區|鶯歌區|樹林區|中和區|土城區|瑞芳區|平溪區|雙溪區|貢寮區|金山區|萬里區|汐止區|永和區|淡水區|八里區|三芝區|石門區",{listStyle:builder.ListStyle.inline});        
    },
    function (session,results){
        session.dialogData.shipment.home =results.response.entity;
        var customer = session.dialogData.shipment.customer;
        var telephone = session.dialogData.shipment.telephone;
        var a = session.dialogData.shipment.home;
        // session.send("您目前所住的區域為:"+a);  //五股區
        session.send("===您的基本資料===\n\n姓名："+customer+"\n\n連絡電話："+telephone+"\n\n目前所住的區域為："+a);
        session.send("附近的大型醫院有:");

        // 開始request的工作(取資料) 介接外部API查詢醫院資訊
        var options = {
            method: "GET",     
            url: "http://data.ntpc.gov.tw/api/v1/rest/datastore/382000000A-002779-001",   
        }
        
        request(options, function(error, response, body){
            var stock = JSON.parse(body);     
            // session.send(`取到第一筆醫院的資料\n名稱:${stock.result.records[0].Name}\n地區:${stock.result.records[0].District}\n地址:${stock.result.records[0].Address}\n電話:${stock.result.records[0].Telephone}`);            

            //用迴圈取得所有醫院的資訊
            var arr = stock.result.records; //stock.result.records是一個陣列[]
            // var hospital = []
        
            arr.forEach(function(element) {                
                //只取病患居住地的診所
                if(a == `${element.District}`){          
                    session.send(`名稱:${element.Name}\n地區:${element.District}\n地址:${element.Address}\n電話:${element.Telephone}`);                                             
                }                    
            });
            // session.endDialog()
            // var msg = new builder.Message(session);      
            // session.endConversation(msg);
            session.endConversation();
            session.replaceDialog("mainMenu");                          
        });
    },
]);


// 相關資訊   介接外部影片
bot.dialog('information',[
    function(session){
        session.send("[[ 小影片 ]]")
        // session.send("影片來源:台北市政府")         
        var msg=new builder.Message(session)
        var a= new builder.VideoCard(session)
            .media([
                // {url: 'https://www.youtube.com/watch?v=EgoMaQb6hoU'}  //不能跑

                //  台北市政府可以動，但超久                          
                // {url: 'http://health.gov.taipei/Portals/0/%E6%96%87%E5%AE%A3%E5%87%BA%E7%89%88%E5%93%81/%E7%9F%AD%E7%89%87/%E8%85%B8%E7%97%85%E6%AF%92%E5%AE%A3%E5%B0%8E%E5%8B%95%E7%95%AB_v08_30%E7%A7%92.mp4'}  

                // {url:'https://de3ab0ee.ngrok.io/static/images/rrr.mp4'}   
                {url:'http://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4'}  //替代影片


                
                // {url:'https://ia802302.us.archive.org/27/items/Pbtestfilemp4videotestmp4/video_test.ogv'}      
                // {url: 'http://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4'}
            ])
            // .autostart(true)
            // .autoloop(true)
        msg.addAttachment(a)
        session.send(msg)
        builder.Prompts.choice(session,"嗨~ 想要更了解什麼呢？", infoMenu ,{listStyle:builder.ListStyle.button});
    },
    function(session, results){
        session.beginDialog(infoMenu[results.response.entity]);    
    }
]);


// 介接疾病管制局API 查詢重症病例數
bot.dialog('acuteLocal',[
    function(session){
        session.dialogData.information = {};
        session.send('你好這裡提供2003~2017年全台各縣市「腸病毒感染併發重症」的病例數，歡迎多加查詢!')
        builder.Prompts.choice(session,"請問想調查年份為?",
                            "2003|2004|2005|2006|2007|2008|2009|2010|2011|2012|2013|2014|2015|2016|2017",
                            {listStyle:builder.ListStyle.list});
    },
    function(session,results){
        session.dialogData.information.year = results.response.entity;
        builder.Prompts.choice(session,`想觀察哪個的縣市呢？`,
        "台北市|新北市|桃園市|新竹縣|苗栗縣|台中市|彰化縣|南投縣|雲林縣|嘉義縣|台南市|高雄市|屏東縣|宜蘭縣|花蓮縣|台東縣|澎湖縣",
                            {listStyle:builder.ListStyle.list});
    },
    function (session,results){
        session.dialogData.information.county = results.response.entity;
        var year_self = session.dialogData.information.year;
        var county_self = session.dialogData.information.county;

        // request
        var options = {
            method: "GET",     
            url: "https://od.cdc.gov.tw/eic/Age_County_Gender_0749.json",   
        }
        request(options, function(error, response, body){
            var stock = JSON.parse(body);
            // console.log(stock)
            var cases = []
            stock.forEach(function(item){
                // session.send(item, index, array)
                if((year_self == item.發病年份) & (county_self == item.縣市)){
                    cases.push(item.確定病例數);
                    // session.send("發病年份 : " + item.發病年份 +
                    //             "發病地點 : " + item.縣市 + item.鄉鎮 +
                    //             "病例數 : " + item.確定病例數)
                }
                // console.log(cases.length)             
            });

            
            session.send("幫您查詢到" + county_self + year_self + "年的重症確定病例數有" + cases.length + "例");
            session.send("謝謝您的查詢~")
            // session.send("確定病例數 : " + cases.length)
            session.endConversation();
            session.replaceDialog("mainMenu");
        });
    }
]);

// 設定腸病毒衛教
bot.dialog('babyProtection',[
    function(session){
        var msg = new builder.Message(session);
        var heroCard = new builder.HeroCard(session)
        .title('如何預防家中寶貝感染「腸病毒」')
        .subtitle('擔憂家中小寶貝 你可以這樣預防')
        .text("1.勤洗手，養成良好衛生習慣。\n\n2.均衡飲食、適度運動及充足睡眠。\n\n3.避免出入人潮擁擠，空氣不流通的公共場所。\n\n4.新生兒可多餵食母乳，提高抵抗力。\n\n5.注意居家環境的衛生清潔及通風。\n\n6.兒童玩具（尤其是帶毛玩具）經常清洗、消毒。")
        .images([builder.CardImage.create(session, "https://farm6.staticflickr.com/5486/9674902799_5b8763d388_b.jpg")])
        .buttons([
            builder.CardAction.openUrl(session, "https://tw.news.yahoo.com/%E7%94%B7%E7%AB%A5%E5%98%B4%E7%A0%B4%E7%AB%9F%E5%BE%97%E9%9D%A0%E8%91%89%E5%85%8B%E8%86%9C%E7%BA%8C%E5%91%BD%EF%BC%81%E8%85%B8%E7%97%85%E6%AF%92%E6%87%B6%E4%BA%BA%E5%8C%85%E7%88%B6%E6%AF%8D%E5%BF%85-023053623.html", "了解更多")
        ]);
        msg.addAttachment(heroCard);
        session.endDialog(msg);
    }
]);
// 設定選項清單
var special = '腸病毒特性';
var season = '流行季節';
var gateway = '傳染途徑';
var infectTime = '傳染力 ＆ 傳染期間';
var infectAge = '各年齡層被感染的危險程度';
var fatal = '致命機率';
var immunity = '康復之後的免疫力';
var symptom = '感染症狀';
var acuteOmen = '併發重症前兆';

var questionName = [special, season, gateway, infectTime, infectAge, fatal, immunity, symptom, acuteOmen];
// 設定防呆機制
bot.dialog('whatEnterovirus',[
    function (session) {
        builder.Prompts.choice(session, '想了解哪個方向呢?', questionName, {
            maxRetries: 3,
            retryPrompt: '這問題我無法招架><"，希望您問選項內的就好~（輸入選項號碼也行唷！）',
            listStyle: 2
        });
    },
    function (session, results) {

        // create the card based on selection
        var selectedQuestionName = results.response.entity;
        var question = createCard(selectedQuestionName, session);

        // attach the card to the reply message
        var msg = new builder.Message(session).addAttachment(question);
        session.send(msg);
    }
]);
// 設定衛教圖文
function createCard(selectedQuestionName, session) {
    switch (selectedQuestionName) {
        case special:
            return createSpecial(session);
        case season:
            return createSeason(session);
        case gateway:
            return createGateway(session);
        case infectTime:
            return createInfectTime(session);
        case infectAge:
            return createInfectAge(session);
        case fatal:
            return createFatal(session);
        case immunity:
            return createImmunity(session);
        case symptom:
            return createSymptom(session);
        case acuteOmen:
            return createAcuteOmen(session);
        default:
            return createSpecial(session);
    }
}
function createSpecial(session) {
    return new builder.HeroCard(session)
        .title('腸病毒的特性')
        .subtitle('要多多洗手哦~')
        .text('1.腸病毒分布廣泛且生存力強\n\n2.型別眾多，發病前即有傳染力，且患者感染後可長期排放病毒\n\n3.傳染途徑多元- 飛沫、糞口、接觸\n\n 4.不顯性感染者多，不自覺為病毒散播者\n\n 5.目前除小兒麻痺病毒外，國內尚無疫苗或特效藥可預防或治療\n\n 6.導致併發重症，進而產生後遺症或死亡的因素很多，無法杜絕死亡病例的發生')
        .images([
            builder.CardImage.create(session, 'https://www.cdc.gov.tw/uploads/Files/original/f8546173-b4ab-405c-a2fe-6ecf77dc1fe6.jpg')
        ])
        .buttons([
            builder.CardAction.imBack(session, "就是要知道更多!", "了解更多"),
            builder.CardAction.imBack(session, "回主選單", "返回主選單")
        ])
}
function createSeason(session) {
    return new builder.HeroCard(session)
        .title('腸病毒的流行季節')
        .subtitle('四月到九月')
        .text('1. 臺灣地區全年都有感染個案<br />2. 一般以四月到九月為流行期')
        .images([
            builder.CardImage.create(session, 'http://havemary.com/upload/pic/2017-04-04-1491266121.jpg')
        ])
        .buttons([
            builder.CardAction.imBack(session, "就是要知道更多!", "了解更多"),
            builder.CardAction.imBack(session, "回主選單", "返回主選單")
        ]);
}
function createGateway(session) {
    return new builder.HeroCard(session)
        .title('傳染途徑')
        .subtitle('潛伏期:2至10天(平均3至5天) ')
        .text('「糞口傳染」 : <br />吃入受汙染的水或食物、 手部汙染 <br /><br />「飛沫傳染」 : <br />吸入帶有病毒的飛沫 <br /><br />「接觸傳染」<br />接觸病人皮膚水泡 潰瘍、分泌物')
        .images([
            builder.CardImage.create(session, 'https://c1.staticflickr.com/5/4326/36020338516_c31f4c64e8_b.jpg')
        ])
        .buttons([
            builder.CardAction.imBack(session, "就是要知道更多!", "了解更多"),
            builder.CardAction.imBack(session, "回主選單", "返回主選單")
        ]);
}
function createInfectTime(session) {
    return new builder.HeroCard(session)
        .title('傳染力 ＆ 傳染期間')
        .subtitle('圖片來源：https://www.everydayhealth.com.tw/article/429')
        .text('1. 發病之前幾天，即具有傳染力<br />2. 在口鼻分泌物中可持續3至4週，在腸道可持續6至8週<br />3. 發病後的一週內傳染力最強，發病二週後，咽喉病毒排出量減少<br />4. 家庭或人群密集處傳染力高')
        .images([
            builder.CardImage.create(session, 'https://farm4.staticflickr.com/3844/14433876676_0ed06133ed_b.jpg')
        ])
        .buttons([
            builder.CardAction.imBack(session, "就是要知道更多!", "了解更多"),
            builder.CardAction.imBack(session, "回主選單", "返回主選單")
        ]);
}
function createInfectAge(session) {
    return new builder.HeroCard(session)
        .title('各年齡層被感染的危險程度')
        .subtitle('')
        .text('0-5歲 : 大部分無抗體<br />1.免疫系統不如成人完備，抵抗力較弱 <br />2.年紀越小接觸過的病毒越少 <br /><br />' +
                '6歲 (幼兒園) : 1/2有抗體<br />1.幼兒園是容易傳播病菌的地方 <br />2.小孩的衛生習慣較差 <br /><br />' +
                '7-12歲 (國小) : 2/3有抗體 <br />在學校容易被同學傳染 <br /><br />' +
                '成人 : 大部分人都有接觸過腸病毒 <br />因為熬夜、壓力、飲食等因素導致免 疫力下降 <br />')
        .images([
            builder.CardImage.create(session, 'https://www.cdc.gov.tw/uploads/Files/original/fc245194-2ebb-4b04-9112-489c4a031763.jpg')
        ])
        .buttons([
            builder.CardAction.imBack(session, "就是要知道更多!", "了解更多"),
            builder.CardAction.imBack(session, "回主選單", "返回主選單")
        ]);
}
function createFatal(session) {
    return new builder.HeroCard(session)
        .title(fatal)
        .subtitle('多多洗手，遠離腸病毒')
        .text('1. 大多數感染者症狀輕微，甚至沒有症狀 <br />2. 致死率推估約十萬分之一到萬分之一<br />3. 99.9%以上的患者都會完全恢復')
        .images([
            builder.CardImage.create(session, 'https://www.cdc.gov.tw/uploads/Files/original/4dd17d90-9ae6-4abd-87d8-63c5a45826a5.jpg')
        ])
        .buttons([
            builder.CardAction.imBack(session, "就是要知道更多!", "了解更多"),
            builder.CardAction.imBack(session, "回主選單", "返回主選單")
        ]);
}
function createImmunity(session) {
    return new builder.HeroCard(session)
        .title(immunity)
        .subtitle('多多洗手，遠離腸病毒')
        .text('1. 腸病毒群有數十種病毒，得到某一種腸病毒感染以後，至少會持續有數十年的免疫力<br /><br />2. 再接觸同一種病毒時，大多不會再發病')
        .images([
            builder.CardImage.create(session, 'https://www.cdc.gov.tw/uploads/Files/original/77f9d083-5da3-4829-8d57-304bc17eef96.jpg')
        ])
        .buttons([
            builder.CardAction.imBack(session, "就是要知道更多!", "了解更多"),
            builder.CardAction.imBack(session, "回主選單", "返回主選單")
        ]);
}
function createSymptom(session) {
    return new builder.HeroCard(session)
        .title(symbol)
        .subtitle('多多洗手，遠離腸病毒')
        .text('腸病毒感染症狀<br />1. 大多是無症狀感染，或只有類似一般感冒症狀 <br /><br />'+
                '腸病毒感染特殊症狀 : <br />1. 疱疹性咽峽炎<br />2. 手足口病 <br />')
        .images([
            builder.CardImage.create(session, 'https://www.cdc.gov.tw/uploads/Files/original/63f7dbce-ecdc-43bf-bf88-91c0c3030369.jpg')
        ])
        .buttons([
            builder.CardAction.imBack(session, "就是要知道更多!", "了解更多"),
            builder.CardAction.imBack(session, "回主選單", "返回主選單")
        ]);
}
function createAcuteOmen(session) {
    return new builder.HeroCard(session)
        .title(acuteOmen)
        .subtitle('自症狀開始後 7 天內， 注意觀察病童是否出現下列重症前兆病徵 :')
        .text('1. 有嗜睡、意識不清、活 力不佳(以體溫正常時 的精神活力為準)、手腳無力<br />' +
                '2. 肌躍型抽搐(無故驚嚇 或突然間全身肌肉收縮)<br />'+
                '3. 持續嘔吐<br />'+
                '4. 呼吸急促、心跳加快 <br />')
        .images([
            builder.CardImage.create(session, 'http://attach.setn.com/newsimages/2016/03/30/483802-XXL.jpg')
        ])
        .buttons([
            builder.CardAction.imBack(session, "就是要知道更多!", "了解更多"),
            builder.CardAction.imBack(session, "回主選單", "返回主選單")
        ]);
}

// Calculatescore 計算腸病毒、流感、其他原因機率
function Calculatescore(inquiry, session){
    // 重症
    if (inquiry.vomiting == '是'|inquiry.rapidHeartbeat == '是'|inquiry.lethargy == '是'|inquiry.myoclonicjerk == '是'){
        session.send("請注意！您已出現腸病毒重症前兆病徵，請立即前往大醫院接受治療，掌握治療的黃金時間。")
    }else{
        // 年齡
        if (inquiry.ages == '3歲以下'){
            Enterovirus = 3
            Influenza = 0
            Other = 0
        }else if (inquiry.ages == '4~5歲'|inquiry.ages == '6歲~18歲'){
            Enterovirus = 2
            Influenza = 1
            Other = 0
        }else{
        Enterovirus = 1
        Influenza = 1
        Other = 1
        }
        // 病史
        if (inquiry.history == '有'){
            Enterovirus += 3
            Influenza += 0
            Other += 0
        }else{
            Enterovirus += 1
            Influenza += 1
            Other += 1
        }
        // 接觸史
        if (inquiry.contact == '是，僅有接觸過流感患者'){
            Enterovirus += 0
            Influenza += 3
            Other += 0
        }else if (inquiry.contact == '是，僅有接觸過腸病毒患者'){
            Enterovirus += 3
            Influenza += 0
            Other += 0
        }else if (inquiry.contact == '是，兩者皆有接觸過'){
            Enterovirus += 1.5
            Influenza += 1.5
            Other += 0
        }else{
            Enterovirus += 1
            Influenza += 1
            Other += 1
        }
        // 發燒
        if (inquiry.fever == '是'){
            Enterovirus += 1.5
            Influenza += 1.5
            Other += 0
        }else{
            Enterovirus += 1
            Influenza += 1
            Other += 1
        }
        // 發燒時間
        if (inquiry.fevertime.fevertime == '低於一天'){
            Enterovirus += 1
            Influenza += 2
            Other += 0
        }else if (inquiry.fevertime.fevertime == '一天至一週'){
            Enterovirus += 1.5
            Influenza += 1.5
            Other += 0
        }else if (inquiry.fevertime.fevertime == '一週至一個月'){
            Enterovirus += 1
            Influenza += 1
            Other += 1
        }else if (inquiry.fevertime.fevertime == '一個月以上'){
            Enterovirus += 0
            Influenza += 0
            Other += 3
        }else{
            Enterovirus += 0
            Influenza += 0
            Other += 0
        }
        // 發燒度數
        if (inquiry.fevertime.degree == '達40度以上'){
            Enterovirus += 0
            Influenza += 3
            Other += 0
        }else if (inquiry.fevertime.degree  == '未達40度'){
            Enterovirus += 2
            Influenza += 0
            Other += 1
        }else{
            Enterovirus += 0
            Influenza += 0
            Other += 0
        }
        // 退燒藥情況
        if (inquiry.fevertime.antipyretic == '是，有使用，退燒後又復燒'){
            Enterovirus += 3
            Influenza += 0
            Other += 0
        }else if (inquiry.fevertime.antipyretic == '是，有使用，沒退燒'){
            Enterovirus += 0
            Influenza += 3
            Other += 0
        }else if ((inquiry.fevertime.antipyretic == '是，有使用，已退燒')&(inquiry.fevertime.antipyretic == '否，沒使用')){
            Enterovirus += 1
            Influenza += 1
            Other += 1
        }else{
            Enterovirus += 0
            Influenza += 0
            Other += 0
        }
        // 紅疹、水泡
        if (inquiry.blister == '是'){
            Enterovirus += 2
            Influenza += 0
            Other += 1
        }else{
            Enterovirus += 1
            Influenza += 1
            Other += 1
        }
        Enterovirus = ((Enterovirus / 24)*100).toFixed(2)
        Influenza =((Influenza / 24)*100).toFixed(2)
        Other = ((Other / 24)*100).toFixed(2)
        session.send(`根據您的回答，你有${Enterovirus}%疑似為腸病毒、${Influenza}%疑似為流感、${Other}%疑似為其他問題，建議您盡快至附近診所或醫院排除以上可能。`)
    }        
};