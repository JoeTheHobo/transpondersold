let clearButton = $('clearButton');
clearButton.onclick = function() {
    clear();
};

$('leftBar').style.height = (window.innerHeight - 124) + 'px';
window.addEventListener('resize', function(e) {
    $('body').style.width = ((this.window.innerWidth - 300)) +'px';
    $('leftBar').style.height = (window.innerHeight - 124) + 'px';
}, true);

let stats = {
	price: 0,
    retail: 0,
	keys: 0,
	cars: 0,
}


let makes = [];
let remotes = [];

let errorLog = [];
function decodeSheet() {
    //Settings for sheet
    let setCols = 20;
    //End

    let msheet = sheet.split(`	`);
    let nsheet = [];
    //Create nsheet ()
    for (let j = 0; j < msheet.length; j++) {
        //If at end of line on google sheets
        if (j % (setCols-1) == 0 && j !== 0) {
            //Split end of sheet
            let div = msheet[j].replace(/\n/g,`	`).split(`	`);
            nsheet.push(div[0])
            nsheet.push(div[1])
        } else {
            nsheet.push(msheet[j]);
        }
    }

    let lines = [];
    for (let j = 0; j < nsheet.length/setCols; j++) {
        let m = (j*setCols);
        let ymm = nsheet[m+3] ? nsheet[m+3].replace(/\n/g,`	`).replace('"','').split(`	`) : nsheet[m+3];
        ymms = [];
        if (ymm) {
            for (let k = 0; k < ymm.length; k++) {
                let ymmObj = {
                    year1: '',
                    year2: '',
                    make: '',
                    model: '',
                    notes: '',
                }
                let mode = 1; //1 == year, 2 = make, 3 = model
                for (let p = 0; p < ymm[k].length; p++) {
                    if ((ymm[k].charAt(p) == ' ' && mode !== 4) || (ymm[k].charAt(p) == '-' && mode == 1)) {
                        if (ymm[k].charAt(p) == ' ' && mode == 1) {
                            mode++;
                            ymmObj.year2 = ymmObj.year1;
                        }
                        mode++;

                        if (mode == 5) mode = 4;
                    } else {
                        if (mode == 1) ymmObj.year1 += ymm[k].charAt(p);
                        if (mode == 2) ymmObj.year2 += ymm[k].charAt(p);
                        if (mode == 3) ymmObj.make += ymm[k].charAt(p);
                        if (mode == 4) {
                            if (ymm[k].charAt(p) !== '"')
                                ymmObj.model += ymm[k].charAt(p);
                        }
                    }
                }
                //Fix Years
                ymmObj.year1 = Number(ymmObj.year1);
                ymmObj.year2 = Number(ymmObj.year2);
                ymmObj.make = ymmObj.make.toLowerCase();
                ymmObj.model = ymmObj.model.toLowerCase();
                if (ymmObj.model.charAt(0) == ' ') ymmObj.model = ymmObj.model.substring(1,ymmObj.model.length);
                if (ymmObj.model.charAt(ymmObj.model.length-1) == ' ') ymmObj.model = ymmObj.model.substring(0,ymmObj.model.length-1);
                //Seperate Notes from Model if needed
                let startNotes = false;
                let newModel = '';
                for (let p = 0; p < ymmObj.model.length; p++ ) {
                    if (ymmObj.model.charAt(p) == '(') {
                        startNotes = true;
                        if (newModel.charAt(newModel.length -1) == " ") {
                            newModel = newModel.substring(0,newModel.length - 1);
                        }
                        continue;
                    }
                    if (ymmObj.model.charAt(p) == ')') {
                        startNotes = false;
                        break;
                    }
                    if (startNotes) ymmObj.notes += ymmObj.model.charAt(p);
                    else newModel += ymmObj.model.charAt(p);

                }
                if (newModel.charAt(newModel.length -1) == " ") {
                    newModel = newModel.substring(0,newModel.length - 1);
                }
                ymmObj.model = newModel;

                ymms.push(ymmObj);
				if (ymmObj.model == '') {
					errorLog.push({
						type: 'model',
						location: m,
						car: nsheet[m],
						col: nsheet[m+1],
						row: nsheet[m+2],
					});
				}
				if (ymmObj.make == '') {
					errorLog.push({
						type: 'make',
						location: j,
						car: nsheet[m],
						col: nsheet[m+1],
						row: nsheet[m+2],
					});
				}
            }
        }

        //Find Resale Value
        let cost = Number(nsheet[m+12])*2;
        let retail = cost;
        if (cost < 45) retail = 45;
        else if (cost < 95) retail = 95;
        else retail = Math.ceil(cost/10)*10;

        if (nsheet[m+18] == 'key' && !nsheet[m+6].toLowerCase().includes('pt')) {
            if (retail < 95) retail = 95;
        }

        if (!isNaN(retail)) stats.retail += retail;

        let obj = {
            car: nsheet[m],
            col: nsheet[m+1],
            row: Number(nsheet[m+2]),
            ymm: ymms,
            fccid: nsheet[m+4],
            model: nsheet[m+5],
            type: nsheet[m+6],
            amount: Number(nsheet[m+7]),
            frequency: nsheet[m+8],
            chip: nsheet[m+9],
            battery: nsheet[m+10],
            link: nsheet[m+11],
            price: Number(nsheet[m+12]),
            notes: nsheet[m+13],
            imgLink: nsheet[m+14],
            old: nsheet[m+15],
            xhorse: nsheet[m+16],
            id: nsheet[m+17],
            itemType: nsheet[m+18],
            bladeType: nsheet[m+19],
            retail: retail,
        }
        lines.push(obj);
    }

    //Create Cars List
    let cars = [];
    let makes = [];
	let parts = [];
    for (let i = 0; i < lines.length; i++) {
		//Stats
		let value = (lines[i].amount * lines[i].price);
		if (!isNaN(value)) {
			stats.price += value;
		}
		if (!isNaN(lines[i].amount)) {
			stats.keys += lines[i].amount;
		}
		//Carry On
        for (let j = 0; j < lines[i].ymm.length; j++) {
            let mmake = lines[i].ymm[j].make;
            let mmodel = lines[i].ymm[j].model;
            let mnotes = lines[i].ymm[j].notes;
            for (let k = 0; k < (lines[i].ymm[j].year2-lines[i].ymm[j].year1)+1; k++) {
                let l = lines[i];
                
                let found = false;
                for (let p = 0; p < makes.length; p++) {
                    if (makes[p].name == mmake) found = p;
                }
                if (found === false) {
                    makes.push({
                        name: mmake,
                        models: [],
                    });
                    found = makes.length - 1;
                }

                let found2 = false;
                for (let p = 0; p < makes[found].models.length; p++) {
                    if (makes[found].models[p].name == mmodel) found2 = p;
                }
                if (found2 === false) {

                    makes[found].models.push({
                        name: mmodel,
                        years: [],
                    })
                    found2 = makes[found].models.length - 1;
                }

                let found3 = false;
                for (let p = 0; p < makes[found].models[found2].years.length; p++) {
                    if (makes[found].models[found2].years[p].year == lines[i].ymm[j].year1+k) found3 = p;
                }
                if (found3 === false) {
					
					stats.cars += 1;
					
                    makes[found].models[found2].years.push({
                        year: lines[i].ymm[j].year1+k,
                        make: mmake,
                        model: mmodel,
                        keys: [],
                    })
                    found3 = makes[found].models[found2].years.length - 1;
                }

                makes[found].models[found2].years[found3].keys.push({
                    keyNotes: mnotes,
                    col: l.col,
                    row: l.row,
                    car: l.car,
                    fccid: l.fccid,
                    keymodel: l.model,
                    type: l.type,
                    amount: l.amount,
                    frequency: l.frequency,
                    chip: l.chip,
                    battery: l.battery,
                    link: l.link,
                    worksOn: lines[i].ymm,
					price: l.price,
					notes: l.notes,
					imgLink: l.imgLink,
					old: l.old,
					xhorse: l.xhorse,
					id: l.id,
                    itemType: l.itemType,
                    bladeType: l.bladeType,
                    retail: l.retail,
                })
                

                let c = {
                    keyNotes: mnotes,
                    make: mmake,
                    model: mmodel,
                    year: lines[i].ymm[j].year1+k,
                    col: l.col,
                    row: l.row,
                    car: l.car,
                    fccid: l.fccid,
                    keymodel: l.model,
                    type: l.type,
                    amount: l.amount,
                    frequency: l.frequency,
                    chip: l.chip,
                    battery: l.battery,
                    link: l.link,
					price: l.price,
					notes: l.notes,
					imgLink: l.imgLink,
					old: l.old,
					xhorse: l.xhorse,
					id: l.id,
                    itemType: l.itemType,
                    bladeType: l.bladeType,
                    retail: l.retail,
                }
                cars.push(c)
            }
        }


    }
	
	if (errorLog.length > 0) {
		console.log('Errors were found:');
		console.log(errorLog)
	}

	//Add Stats
	$('statPrice').innerHTML = 'Total Value: $' + (Math.floor(stats.price*100)/100);
	$('statRetail').innerHTML = 'Total Retail: $' + (Math.floor(stats.retail*100)/100);
	$('statKeys').innerHTML = 'Total Keys: ' + stats.keys;
	$('statCars').innerHTML = 'Total Cars: ' + stats.cars;
	
	//Check Cookies
	let cookieList = ls.get('keyList',[]);
	for (let i = 0; i < lines.length; i++) {
		for (let j = 0; j < cookieList.length; j++) {
			let l = lines[i];
			let c = cookieList[j];
			if (l.id === c.id) {
				l.amount = c.amount;
			}
		}
	}
	

    return {
        makes: makes,
        lines: lines,
		parts: parts,
    }
}
let carColors = [
    ['FCA','#9fc5e8'],
    ['FMC','#38761d'],
    ['GM','#f1c232'],
    ['HMC','#ff0000'],
    ['HMG','#0b5394'],
    ['MAZ','#00ff00'],
    ['MIT','#8e7cc3'],
    ['NMC','#ffe599'],
    ['SUB','#ff9900'],
    ['TOY','#f4cccc'],
    ['EXT','#7f6000'],
]
function findColor(car) {
    for (let i = 0; i < carColors.length; i++) {
        if (carColors[i][0] == car) return carColors[i][1];
    }
}

let currentBox = false;
let carObj = decodeSheet();
changeStats('price');
carLines = carObj.lines;
let carMakes = carObj.makes;
makeTableMap();
let dataMakes = $('makes');
let dataModels = $('models');
let dataYears = $('years');
let inputMakes = $('makesInput');
let inputModels = $('modelsInput');
let inputYears = $('yearsInput');
$('body').style.width = (window.innerWidth - 300) + 'px';
$('body').style.height = ((window.innerHeight - 124) - $('tableMap').clientHeight) + 'px';

let keyBoxes = $('keyBoxes');
let selectCarDiv = $('selectCar');

setupCars('makes');

function clear() {
    inputMakes.value = '';
    inputModels.value = '';
    inputYears.value = '';
    keyBoxes.innerHTML = '';
    selectCarDiv.innerHTML = '';
    $('pullUp').style.display = 'none';

    selectedMake = false;
    selectedModel = false;
    selectedYear = false;

    setupCars('makes');
    makeTableMap()
}

//Draw Mini boxes for choosing which car
function setupCars(type) {
    if (type == 'makes') {
        //Sort Makes
        let carMakesList = [];
        for (let i = 0; i < carMakes.length; i++) {
            carMakesList.push(carMakes[i].name);
        }
        carMakesList.sort();

        //Draw Make Boxes
        for (let i = 0; i < carMakesList.length; i++) {
            let div = selectCarDiv.create('div');
            div.className = 'carOption';
            let text = div.create('div');
            text.innerHTML = carMakesList[i].toUpperCase();
            text.className = 'carOptionText';
            div.select = carMakesList[i];
            div.onclick = function() {
				clear();
                inputMakes.value = this.select;
                triggerMakeChange();
            }
        }
    }
    if (type == 'models') {
        //Sort Models
        let modelsArr = [];
        for (let i = 0; i < carMakes[selectedMake].models.length; i++) {
            modelsArr.push(carMakes[selectedMake].models[i].name);
        }
        modelsArr.sort();

        //Draw Model Boxes
        for (let i = 0; i < modelsArr.length; i++) {
            let div = selectCarDiv.create('div');
            div.className = 'carOption';
            let text = div.create('div');
            text.innerHTML = modelsArr[i].toUpperCase();
            text.className = 'carOptionText';
            div.select = modelsArr[i];
            div.onclick = function() {
                inputModels.value = this.select;
                triggerModelChange();
            }
        }
    }
    if (type == 'years') {
        //Sort Years
        yearArr = [];
        for (let i = 0; i < carMakes[selectedMake].models[selectedModel].years.length; i++) {
            yearArr.push(carMakes[selectedMake].models[selectedModel].years[i].year);
        }
        yearArr.sort();

        //Draw Years Boxes
        for (let i = 0; i < yearArr.length; i++) {
            let div = selectCarDiv.create('div');
            div.className = 'carOption';
            div.id = 'year' + i;
            let text = div.create('div');
            text.innerHTML = yearArr[i];
            text.className = 'carOptionText';
            div.select = yearArr[i];
            div.onclick = function() {
                inputYears.value = this.select;
                triggerYearChange();
                for (let i = 0; i < yearArr.length; i++) {
                    $('year' + i).style.background = 'white';
                }
                this.style.background = 'lightyellow'
            }
        }
    }
}
let yearArr = [];

let selectedMake = false;
let selectedModel = false;
let selectedYear = false;

function triggerMakeChange() {
    inputModels.value = '';
    inputYears.value = '';
    keyBoxes.innerHTML = '';
    selectedModel = false;
    selectedYear = false;
    $('pullUp').style.display = 'none';

    selectCarDiv.innerHTML = '';
    dataModels.innerHTML = '';

    let found = false;
    for (let i = 0; i < carMakes.length; i++) {
        if (carMakes[i].name == inputMakes.value && inputMakes.value != '') found = i;
    }
    if (found !== false) {
        selectedMake = found;
        let modelsArr = [];
        for (let i = 0; i < carMakes[selectedMake].models.length; i++) {
            modelsArr.push(carMakes[selectedMake].models[i].name);
        }
        modelsArr.sort();
        for (let i = 0; i < modelsArr.length; i++) {
            let opt = dataModels.create('option');
            opt.value = modelsArr[i];
        }

        setupCars('models')
    } else {
        setupCars('makes')
    }
}
function triggerModelChange() {

    inputYears.value = '';
    selectedYear = false;
    keyBoxes.innerHTML = '';
    $('pullUp').style.display = 'none';

    dataYears.innerHTML = '';
    selectCarDiv.innerHTML = '';

    let found = false;
    for (let i = 0; i < carMakes[selectedMake].models.length; i++) {
        if (carMakes[selectedMake].models[i].name == inputModels.value) found = i;
    }
    if (found !== false) {
        selectedModel = found;
        let yearArr = [];
        for (let i = 0; i < carMakes[selectedMake].models[selectedModel].years.length; i++) {
            yearArr.push(carMakes[selectedMake].models[selectedModel].years[i].year);
        }
        yearArr.sort();
        for (let i = 0; i < yearArr.length; i++) {
            let opt = dataYears.create('option');
            opt.value = yearArr[i];
        }
        setupCars('years');
    } else {
        setupCars('models');
    }
}
let keyBoxesShown = 0;
function triggerYearChange() {
	
	keyBoxesShown = 0;
    keyBoxes.innerHTML = '';
    $('pullUp').style.display = 'none';

    let found = false;
    for (let i = 0; i < carMakes[selectedMake].models[selectedModel].years.length; i++) {
        if (carMakes[selectedMake].models[selectedModel].years[i].year == inputYears.value) found = i;
    }

    if (found !== false) {
        selectedYear = found;

        let boxes = carMakes[selectedMake].models[selectedModel].years[selectedYear].keys;
        for (let i = 0; i < boxes.length; i++) {

            let box = boxes[i];
            let st = false;
            for (let i = 0; i < itemTypes.length; i++) {
                if (itemTypes[i].type == box.itemType) st = itemTypes[i];
            }

            //Check If Key Box Should Be Present
            let pass = true;
            let value = $('searchBy').value;
            if (st.searchType !== value) pass = false;
            if (value == 'all') pass = true;

            if (!pass) continue;

            keyBoxesShown++;
            let div = keyBoxes.create('div');
            div.className = 'keyboxHolder';
			div.id = 'keyBox' + keyBoxesShown;
            div.box = box;

            if (st.colorLB) div.style.background = st.colorLB;
			if (boxes[i].amount < 1) {
				div.style.background = 'pink';
			}
            
            let keyBoxId = div.create('div');
            keyBoxId.className = 'keyboxItem';
            keyBoxId.id = 'keyBoxLocation'
            keyBoxId.innerHTML = 'Location: ' + boxes[i].col.toUpperCase() + boxes[i].row;

            if (box.keyNotes) {
                let type = div.create('div');
                type.className = 'keyboxItem';
                type.id = 'keyBoxItemNotes'
                type.innerHTML = 'Notes: ' + box.keyNotes.toUpperCase();
            }

            if (st.buttons && st.keyVSitem == 'key') {
                let type = div.create('div');
                type.className = 'keyboxItem';
                type.innerHTML = 'Key Type: ' + box.type;
            }
            if (st.itemType && st.keyVSitem == 'item') {
                let type = div.create('div');
                type.className = 'keyboxItem';
                type.innerHTML = 'Item Type: ' + box.itemType.toUpperCase();
            }

            

            let amt = div.create('div');
            amt.className = 'keyboxItem';
            let useName = box.itemType.toUpperCase();
            if (st.altName) useName = st.altName.toUpperCase();
            amt.innerHTML = useName + 'S Left: ' + box.amount;

            
            if (st.retail) {
                let type = div.create('div');
                type.className = 'keyboxItem';
                type.innerHTML = 'Retail Price: $' + box.retail;
            }
            if (st.fccID) {
                let fccid = div.create('div');
                fccid.className = 'keyboxItem';
                fccid.innerHTML = 'FCC ID: ' + box.fccid;
            }
            if (st.model) {
                let keymodel = div.create('div');
                keymodel.className = 'keyboxItem';
                keymodel.innerHTML = 'Key Model: ' + box.keymodel;
            }
			
            div.onclick = function() {
                let car = this.box;
                makeTableMap(car.col,car.row)
                pullUp(car);
				for (let i = 1; i < keyBoxesShown + 1; i++) {
					$('keyBox' + i).style.border = '3px solid black';
				}
				this.style.border = '3px solid gold';
            }

        }
    } else {
        setupCars('years')
    }
}


inputMakes.onchange = function() {
    triggerMakeChange();
}
inputModels.onchange = function() {
    triggerModelChange();
}
inputYears.onchange = function() {
    triggerYearChange();
}
$('searchBy').onchange = function() {
    if (selectedYear) triggerYearChange();
    if (!selectedMake) clear();
}

let carMakesList = [];
for (let i = 0; i < carMakes.length; i++) {
    carMakesList.push(carMakes[i].name);
}
carMakesList.sort();
for (let i = 0; i < carMakesList.length; i++) {
    let opt = dataMakes.create('option');
    opt.value = carMakesList[i];
}

function saveCookies() {
	let toSave = [];
	for (let i = 0; i < carObj.lines.length; i++) {
		let l = carObj.lines[i];
		toSave.push({
			id: l.id,
			amount: l.amount,
		});
	}
	ls.save("keyList",toSave);
}

function makeTableMap(ccol = "FALSE",crow = "FALSE",lines = carObj.lines) { 
    remotes = [];
    let abc = ['A','B','C','D','E','F','G','H','I','J','K','L','M','O','P','Q','R','S','T','U','V','W','X','Y','Z','AA','AB','AC','AD','AE','AF','AG'];
    let height = 12;
    let length = 32;
    let order = ['TOY','SUB','MAZ','HMC','FMC','GM','HMG','NMC','FCA','MIT','EXT'];
    let newLines = [];
    for (let i = 0; i < order.length; i++) {
        for (let j = 0; j < lines.length; j++) {
            if (lines[j].car == order[i]) newLines.push(lines[j])
        }
    }

    lines = newLines;

    let table = $('tableMap');
    table.innerHTML = '';
    for (let i = height-1; i > -2; i--) {
        let row = table.insertRow(0);
        for (let j = length-1; j > -2; j--) {
            if (i == -1) {
                let cell = row.insertCell(0);
                cell.className = 'keyBoxNumber';
                if (j > -1) cell.innerHTML = abc[j];
                if (j+1 == 0) cell.innerHTML = '';
            } else {
                if (j == -1) {
                    let cell = row.insertCell(0);
                    cell.className = 'keyBoxLetter';
                    cell.innerHTML = i+1;
                } else {
                    let cell = row.insertCell(0);
                    cell.className = 'keyBox';
                    
                    cell.row = i+1;
                    cell.col = abc[j];
					
                    let color;
                    if (getBoxFromId(cell.col + cell.row)) {
                        color = findColor(getBoxFromId(cell.col + cell.row).car)
                    }
                    if (cell.row == crow && cell.col.toLowerCase() == ccol.toLowerCase())  {
                        cell.className = 'keyBoxSelected';
                        color = 'white';
                    }
                    let brightnessFilter = 1;
                    if (getBoxFromId(cell.col + cell.row)) {
                        brightnessFilter = getBoxFromId(cell.col + cell.row).amount > 0 ? 1 : .5;
                    }
                    cell.css({
                        background: color,
                        filter: "brightness(" + brightnessFilter + ")",
                    })
                    
                    cell.style.border = '1px solid #333';
                    if (j % 8 == 0) {
                        cell.style.borderLeft = '3px solid black';
                    }
                    if (i % 6 == 0) {
                        cell.style.borderTop = '3px solid black';
                    }
                    cell.id = cell.col.toLowerCase() + cell.row;
                    cell.line = findLineFromCCR(cell.id);
                    if (cell.line) {
                        if (cell.line.itemType.toLowerCase() == 'remote') remotes.push(cell.line);
                        cell.innerHTML = cell.line.itemType.charAt(0).toUpperCase();
                        if (cell.innerHTML == 'K' || cell.innerHTML == 'P') cell.innerHTML = '';
                    }
					
					if (!getBoxFromId(cell.id)) {
						cell.css({
							background: 'gray',
						})
					}
					
        
                    cell.onclick = function() {
						clear();
                        pullUp(getBoxFromId(this.id))
						$(this.id).className = 'keyBoxSelected';
						$(this.id).style.background = 'white';
						$(this.id).style.filter = 'brightness(1)';
                    }
                }
            }
        }
    }
}
function getItemFromBox(box) {
	let brow = box.row;
	let bcol = box.col;
	
	let foundLine = false;
	for (let i = 0; i < carObj.lines.length; i++) {
		let c = carObj.lines[i];
		if (c.row === brow && c.col === bcol) {
			foundLine = i;
		}
	}
	let foundMakes = [];
	for (let i = 0; i < carObj.makes.length; i++) {
		let c = carObj.makes[i];
		for (let j = 0; j < c.models.length; j++) {
			let m = c.models[j];
			for (let k = 0; k < m.years.length; k++) {
				let y = m.years[k];
				for (let p = 0; p < y.keys.length; p++) {
					let a = y.keys[p];
					if (a.row === brow && a.col === bcol) {
						foundMakes.push([i,j,k,p]);
					}
				}
			}
		}
	}
	return {
		line: foundLine,
		makes: foundMakes,
	}
}
function getBoxFromId(id) {
    let box = false;
    for (let i = 0; i < carObj.lines.length; i++) {
        let cl = carObj.lines[i];
        if ((cl.col + cl.row + '').toLowerCase() == id.toLowerCase()) box = i;
    }
    return carObj.lines[box];
}
function openInNewTab(url) {
    window.open(url, '_blank').focus();
  }
let itemTypes = [];
itemTypes.push({
    type: 'key',
    color: 'black',
    colorLB: false,
    keyVSitem: 'key',
    canSearch: true,
    searchType: 'key',
    bladeType: true,
    location: true,
    itemType: false,
    buttons: true,
    battery: true,
    frequency: true,
    amount: true,
    chip: true,
    fccID: true,
    model: true,
    link: true,
    ourCost: true,
    retail: true,
    photo: true,
    notes: true,
    worksOn: true,
    goToCCR: false,
    extraOf: false,
})
itemTypes.push({
    type: 'remote',
    color: '#008833',
    colorLB: '#65a765',
    canSearch: true,
    searchType: 'remote',
    keyVSitem: 'item',
    location: true,
    bladeType: false,
    itemType: true,
    buttons: true,
    frequency: true,
    amount: true,
    battery: true,
    chip: false,
    fccID: true,
    model: true,
    link: true,
    ourCost: true,
    retail: true,
    photo: true,
    notes: true,
    worksOn: true,
    goToCCR: false,
    extraOf: false,
})
itemTypes.push({
    type: 'shell',
    color: 'yellow',
    colorLB: 'yellow',
    canSearch: true,
    keyVSitem: 'key',
    searchType: 'shell',
    location: true,
    bladeType: true,
    itemType: false,
    buttons: true,
    frequency: false,
    battery: false,
    amount: true,
    chip: false,
    fccID: false,
    model: true,
    link: true,
    ourCost: true,
    retail: true,
    photo: true,
    notes: true,
    worksOn: true,
    goToCCR: false,
    extraOf: false,
})
itemTypes.push({
    type: 'chip',
    color: 'black',
    colorLB: false,
    keyVSitem: 'item',
    searchType: 'chip',
    canSearch: true,
    location: true,
    bladeType: false,
    itemType: true,
    buttons: true,
    frequency: false,
    battery: false,
    amount: true,
    chip: true,
    fccID: true,
    model: true,
    link: true,
    ourCost: true,
    retail: true,
    photo: true,
    notes: true,
    worksOn: true,
    goToCCR: false,
    extraOf: false,
})
itemTypes.push({
    type: 'blade',
    color: 'white',
    colorLB: 'white',
    searchType: 'blade',
    canSearch: true,
    location: true,
    keyVSitem: 'item',
    itemType: true,
    bladeType: true,
    buttons: true,
    frequency: false,
    battery: false,
    amount: true,
    chip: false,
    fccID: false,
    model: true,
    link: true,
    ourCost: true,
    retail: true,
    photo: true,
    notes: true,
    worksOn: true,
    goToCCR: false,
    extraOf: false,
})
itemTypes.push({
    type: 'extra',
    color: 'black',
    searchType: false,
    colorLB: false,
    canSearch: false,
    location: true,
    bladeType: false,
    keyVSitem: 'item',
    itemType: true,
    buttons: false,
    battery: false,
    frequency: false,
    amount: false,
    chip: false,
    fccID: false,
    model: false,
    link: false,
    ourCost: false,
    retail: false,
    photo: true,
    notes: false,
    worksOn: false,
    goToCCR: true,
    extraOf: true,
})
itemTypes.push({
    type: 'empty',
    color: 'black',
    searchType: false,
    colorLB: false,
    battery: false,
    canSearch: false,
    bladeType: false,
    keyVSitem: 'item',
    location: false,
    itemType: true,
    buttons: false,
    frequency: false,
    amount: false,
    chip: false,
    fccID: false,
    model: false,
    link: false,
    ourCost: false,
    retail: false,
    photo: false,
    notes: false,
    worksOn: false,
    goToCCR: false,
    extraOf: false,
})
itemTypes.push({
    type: 'pt',
    searchType: 'key',
    altName: 'key',
    color: 'black',
    colorLB: false,
    battery: false,
    bladeType: true,
    keyVSitem: 'key',
    canSearch: true,
    location: true,
    itemType: true,
    buttons: true,
    frequency: false,
    amount: true,
    chip: true,
    fccID: false,
    model: true,
    link: true,
    ourCost: true,
    retail: true,
    photo: true,
    notes: true,
    worksOn: true,
    goToCCR: false,
    extraOf: false,
})

option = $('searchBy').create('option');
option.value = 'all';
option.innerHTML = 'ALL';
for (let i = 0; i < itemTypes.length; i++) {
    if (!itemTypes[i].canSearch) break;

    option = $('searchBy').create('option');
    option.value = itemTypes[i].searchType;
    option.innerHTML = itemTypes[i].searchType.toUpperCase() + 'S';
}

function pullUp(box) {
    let selectedType = false;
	
	currentBox = box;
    if (box === undefined) {
        box = {itemType: 'empty'}
		currentBox = false;
    }

    for (let i = 0; i < itemTypes.length; i++) {
        if (itemTypes[i].type == box.itemType) selectedType = itemTypes[i];
    }

    let useName = box.itemType.toUpperCase();
    if (selectedType.altName) useName = selectedType.altName.toUpperCase();

    $('pullUp').style.display = 'inline-block';

	$('.amountBtn')[0].style.display = selectedType.buttons ? 'block' : 'none';
	$('.amountBtn')[1].style.display = selectedType.buttons ? 'block' : 'none';
	$('.amountBtn2').style.display = selectedType.buttons ? 'block' : 'none';
    if (selectedType.goToCCR) {
		$('puGoToCCR').style.display = 'block';
		$('puGoToCCR').a = box.model;
        let r = '', c = '';
        for (let i = 0; i < box.model.length; i++) {
            if (isNaN(box.model.charAt(i))) r += box.model.charAt(i);
            else c += box.model.charAt(i);
        }
        $('puGoToCCR').r = r;
        $('puGoToCCR').c = c;
		$('puGoToCCR').onclick = function() {
			pullUp(getBoxFromId(this.a));
            makeTableMap(this.r,this.c);
		}
    } else $('puGoToCCR').style.display = 'none';

    $('identification').style.display = 'block';
    if (box === undefined) $('identification').innerHTML = 'Key Box Is Empty';
    else if (selectedType.location) $('identification').innerHTML = box.col.toUpperCase() + box.row;
    else $('identification').style.display = 'none';

	if (!selectedType.buttons) $('puType').style.display = 'none';
	else {
        $('puType').style.display = 'block';
        $('puType').style.color = selectedType.color ? selectedType.color : 'black';
        $('puType').innerHTML = 'Button Type: ' + box.type;
    }
	if (!selectedType.itemType) $('puItemType').style.display = 'none';
	else {
        $('puItemType').style.display = 'block';
        $('puItemType').style.color = selectedType.color ? selectedType.color : 'black';
        $('puItemType').innerHTML = 'Item Type: ' + useName;
    }

    if (!selectedType.frequency) $('puFrequency').style.display = 'none';
	else {
        $('puFrequency').style.display = 'block';
		$('puFrequency').innerHTML = 'Frequency: ' + box.frequency;
    }

    
    if (!selectedType.bladeType) $('puBladeType').style.display = 'none';
	else {
        $('puBladeType').style.display = 'block';
		$('puBladeType').innerHTML = 'Test Blade: ' + box.bladeType;
    }

    if (!selectedType.chip) $('puChip').style.display = 'none';
	else {
        $('puChip').style.display = 'block';
		let chip = '';
		if (box.chip) chip += box.chip;
		if (box.xhorse && !box.chip) chip += box.xhorse;
		if (box.chip && box.xhorse) chip += '/' + box.xhorse;
		if (!box.chip && !box.xhorse) chip = 'No Information Found';
		$('puChip').innerHTML = 'Chip: ' + chip;
    }


    if (!selectedType.battery) $('puBattery').style.display = 'none';
	else {
        $('puBattery').style.display = 'block';
		$('puBattery').innerHTML = 'Battery: ' + box.battery;
    }
    
    $('puLink').style.display = 'none';
    if (selectedType.link) {
		if (box.link) {
            $('puLink').style.display = 'block';
			$('puLink').onclick = function() {
                openInNewTab(box.link);
            }
			$('puLink').innerHTML = 'Buy This ' + useName + '!';
		}
    }

    if (!selectedType.amount) $('puAmount').style.display = 'none';
	else {
        $('puAmount').style.display = 'block';
		$('puAmount').innerHTML = useName + 'S Left: ' + box.amount;
    }

    $('worksOnList').style.display = 'none';
    $('worksNotes').style.display = 'none';
    $('rightSide').style.display = 'none';
    if (selectedType.worksOn) {
        $('rightSide').style.display = 'block';
        $('worksOnList').style.display = 'block';

		//Create Works On Car List
        if (selectedType.notes) {
            $('worksNotes').style.display = 'block';
            $('worksNotes').innerHTML = box.notes;
        }
		let carList = $('worksOnList');
		carList.innerHTML = '';
		let carArr = false;
		if (box.worksOn) {
			carArr = box.worksOn;
		} else if (box.ymm) {
			carArr = box.ymm;
		}
		for (let i = 0; i < carArr.length; i++) {
			let b = carArr[i];
			let div = carList.create('div');
			div.innerHTML = b.year1 + '-' + b.year2 + ' ' + b.make + ' ' + b.model + ' ' + b.notes;
		}

    }

    if (!selectedType.extraOf) $('puExtraOf').style.display = 'none';
	else {
        $('puExtraOf').style.display = 'block';
        $('puExtraOf').innerHTML = 'Extra of: ' + box.model;
    }

    if (!selectedType.ourCost) $('puPrice').style.display = 'none';
	else {
        $('puPrice').style.display = 'block';
        $('puPrice').innerHTML = 'Our Cost: $' + box.price;
    }
    if (!selectedType.retail) $('puRetail').style.display = 'none';
	else {
        $('puRetail').style.display = 'block';
        $('puRetail').innerHTML = 'Retail Price: $' + box.retail;
    }

	$('keyIMG').style.display = 'none';
    if (selectedType.photo) {
        $('keyIMG').style.display = 'block';
        let imgSRC = box.imgLink;
        if (selectedType.goToCCR) imgSRC = findLineFromCCR(box.model).imgLink;
	    $('keyIMG').src = imgSRC;
    }

}

function changeStats(type) {
	if (type == 'price') {
		stats.price = 0;
		stats.keys = 0;
		for (let i = 0; i < carObj.lines.length; i++) {
			let c = carObj.lines[i];
			if (!isNaN(c.amount * c.price))
				stats.price += (c.amount * c.price);
			if (!isNaN(c.amount))
				stats.keys += c.amount;
		}
		
		$('statPrice').innerHTML = 'Total Value: $' + (Math.floor(stats.price*100)/100);
		$('statKeys').innerHTML = 'Total Keys: ' + stats.keys;
	}
	
}

function adjustAmt(amt,skip = false) {
	if (currentBox.amount + amt < 0) return;
	
	let obj = getItemFromBox(currentBox);
	if (amt === 0) carObj.lines[obj.line].amount = 0;
    else carObj.lines[obj.line].amount += amt;
	for (let i = 0; i < obj.makes.length; i++) {
		let a = obj.makes[i];
        if (amt === 0) carObj.makes[a[0]].models[a[1]].years[a[2]].keys[a[3]].amount = 0;
		else carObj.makes[a[0]].models[a[1]].years[a[2]].keys[a[3]].amount += amt;
	}
	changeStats('price');
	
	if (selectedYear)
		triggerYearChange();
	saveCookies();
	pullUp(currentBox);
}

function findLineFromCCR(ccr) {
	let obj = {
		col: '',
		row: ''
	}
	for (let i = 0; i < ccr.length; i++) {
        if (!isNaN(Number(ccr.charAt(i)))) obj.row += Number(ccr.charAt(i))
        else obj.col += ccr.charAt(i).toLowerCase();
	}

	for (let i = 0; i < carObj.lines.length; i++) {
		let line = carObj.lines[i]
		if (line.row == obj.row && line.col == obj.col) return carObj.lines[i];
	}
}

$('remoteViewerButton').onclick = remoteViewerPopup;
$('remoteViewer').style.display = 'none';
function remoteViewerPopup() {
    if ($('remoteViewer').style.display == 'none') {
        $('remoteViewer').style.display = 'block';
        $('remoteBottom').style.display = 'block';
        $('remoteViewer').innerHTML = '';
        $('remoteViewerButton').innerHTML = 'Key Viewer';

        let x = 10;
        let length = (window.innerWidth-(x*6)) / x;
        let maxHeight = window.innerHeight - 25;
        let y = maxHeight % length;

        for (let i = 0; i < remotes.length; i++) {
            let remoteBox = $('remoteViewer').create('img');
            remoteBox.id = 'remoteHolder';
            remoteBox.width = length;
            remoteBox.height = length;
            remoteBox.box = remotes[i].col.toUpperCase() + remotes[i].row;
            remoteBox.onclick = function() {
                pullUp(getBoxFromId(this.box));
                makeTableMap(getBoxFromId(this.box).col,getBoxFromId(this.box).row);
                remoteViewerPopup();
            }
            remoteBox.css({
                cursor: 'pointer',
                margin: "0px",
                padding: '0px',
            })
            remoteBox.src = remotes[i].imgLink;
        }

    } else {
        $('remoteViewer').style.display = 'none';
        $('remoteViewerButton').innerHTML = 'Remote Viewer';
        $('remoteBottom').style.display = 'none';
    }
}
