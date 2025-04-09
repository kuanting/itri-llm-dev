const ASSIST_HEADER = {
		'Content-Type': 'application/json',
		'Authorization': 'Bearer ' + OPENAI_ACCESS_TOKEN,
		'OpenAI-Beta': 'assistants=v2'
		};

const MAX_RUN_FETCH_TIMES = 10

const cache = CacheService.getScriptCache();

function callAssistant(user_id, user_msg) {
  try {
		// 1. Get thread ID, each line user has only 1 thread
    var threadID = cache.get(user_id);
    if (threadID == null) {
      // Create new OpenAI thread
      ret = UrlFetchApp.fetch('https://api.openai.com/v1/threads', {
                              'method': 'post',
                              'headers': ASSIST_HEADER});
      threadID = JSON.parse(ret).id;
      cache.put(user_id, threadID, 21600); // will be kept up to 6 hours
    } 

		// 2. Create a message
		msg_res = UrlFetchApp.fetch('https://api.openai.com/v1/threads/' + threadID + '/messages', {
                                'method': 'post',
                                'headers': ASSIST_HEADER,
                                'payload': JSON.stringify({
                                  "role": "user",
                                  "content": user_msg
                                  })
                                })
		messageID = JSON.parse(msg_res).id;

		// 3. Create run
		run_res = UrlFetchApp.fetch('https://api.openai.com/v1/threads/' + threadID + '/runs', {
                                'method': 'post',
                                'headers': ASSIST_HEADER,
                                'payload': JSON.stringify({
                                  "assistant_id": ASSISTANT_ID,
                                  })
                                })
		runID = JSON.parse(run_res).id;
		
		// 4. Check if the run is completed
		var runDone = false
		var check_times = 0
		while (!runDone && check_times < MAX_RUN_FETCH_TIMES) {
			Utilities.sleep(1000); // Wait for 1000 ms
			run_chk = UrlFetchApp.fetch('https://api.openai.com/v1/threads/' + threadID + '/runs/' + runID, {
                                  'headers': ASSIST_HEADER
                                  })
		  run_data = JSON.parse(run_chk)
			
			if (run_data.completed_at !== null && typeof(run_data.completed_at) !== 'undefined') {
				runDone = true
			}
			check_times++
		}

		// 5. Get message list
		var res_message = 'Sorry! Server is not available now. Talk to you later.'
		if (runDone) {
			res = UrlFetchApp.fetch('https://api.openai.com/v1/threads/' + threadID + '/messages?order=desc&limit=1', {
				'headers': ASSIST_HEADER
				})
			data = JSON.parse(res)
			//console.log(JSON.stringify(data))
			if (data.data[0].content.length > 0)
				res_message = data.data[0].content[0].text.value
		}

    return res_message;
  }
  catch(err) {
		console.error(err);
	}
}

function chatCompletion(user_msg) {
  ret = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
    'method': 'post',
    'headers': {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + OPENAI_ACCESS_TOKEN,
    },
    'payload': JSON.stringify({
      "model": "gpt-3.5-turbo",
      "messages": [
			{role: "system", content: 'This GPT will act as a knowledgeable lab assistant for the AIoT Lab, which is part of the Department of Electronic Engineering at National Taipei University of Technology. It will answer questions from students regarding lab facts, procedures, and information. It should provide accurate and concise information related to the AIoT Lab and be helpful and supportive in guiding students through their inquiries. The lab was founded by Dr. Kuan-Ting Lai (賴冠廷), who has a distinguished background in Electric Engineering and Computer Science from National Taiwan University, Prof. Kuan-ting Lai’s research interests include computer vision, drones and Internet-of-Things (IoT). He has published 20+ international conference and journal papers, which have been cited more than 600+ times. His publications can be found here (https://scholar.google.com.tw/citations?user=5o3YVKQAAAAJ). Recent research focuses on combining computer vision with deep reinforcement learning and virtual reality, and developing Virtual Environment for Visual Deep Learning (VIVID), which can be used to simulate and train deep models of drones and self-driving cars. VIVID won the 2018 ACM Multimedia Best Open Source Software Award. Professor Lai has many years of industry experience and has held positions such as Quanta Computer Hardware R&D Engineer, Academia Sinica Researcher, and Technical Vice President of American Ventures. From 2012 to 2013, he conducted visiting research at Columbia University in the United States.\n' +
    '實驗室的產學合作績效如下:\n' +
    '1. 義隆電子(ELAN Electronics) : 參與開發大型車輛專用之先進駕駛輔助系統(ADAS)。利用VR虛擬實境提升AI模型物件辨識之準確度，並開發自駕車驗證所需之台灣道路交通模擬環境。終端產品已於2023通過驗證順利出貨。\n' +
    '2. 力積電 (PowerChip): 與力積電和台灣大學共同產學合作，開發動作辨識系統晶片，並於FPGA上驗證成功。成果發表於2021 CVPR Workshop。。\n' +
    '3. 2024年起與英飛凌(Infineon)合作開發次世代電動車無線電池管理模組(Wireless Battery Management System)\n' +
    '4. 與台灣無人機應用發展協會合作參加資策會所主辦的108與109年AIGO: AI新世代應用人才培育計畫，訓練約百名學員。\n' +
    '關於學生畢業時間, 至2024年7月為止, 30多位全職碩士生中準時畢業率>95%. 在職班學生的部分已有6位在職生和3位EMBA學生畢業. 由於在職生工作繁忙, 較難兼顧課業, 偶有休學或延畢的狀況. \n' +
    '實驗室研究生畢業後就職企業包括台積電, 友達, QNAP, 廣達, 緯創, 聯發科等上市櫃公司.\n' +
    '目前實驗室113學年度招生名額已滿.\n' +
    'We are looking for students who are passionate about drones, FPGA, green energy, BMS. Computer Vision, VR, and virtual-to-real learning. 想加入實驗室需先通過基礎程式測驗. 以下是兩個參考題目:\n' +
    '1. Java Matrix Multiplication (https://classroom.github.com/a/ojM2OoCT)\n' +
    '2. KNN Classifier (https://classroom.github.com/a/QfYfV8kF)'
			},
			{role: "user", content: user_msg}
		  ],
      "temperature": 0,
      //"max_tokens": 300
    }),
  })
  return JSON.parse(ret).choices[0].message.content;
}