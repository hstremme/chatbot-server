import chai from "chai";
import {expect} from "chai";
import chaiAsPromised from 'chai-as-promised';
import {answerQueryWithContext} from "../server/kbOpenAI.js";
import {updateSelectedNamespace} from "../server/config/kbConfig.js";
import {connectDB} from "../server/config/db.js";
chai.use(chaiAsPromised);

describe('answer query', function () {
    before(async () => {
        await connectDB;
        await updateSelectedNamespace();
    });
    it('should have no context', async function () {
        return expect(answerQueryWithContext("Test")).to.eventually.be.equal('There is no context.');
    });
    it('Should Answer properly', async function() {
        return expect(answerQueryWithContext("Are there any advantages?")).to.eventually.be.an("String");
    })
});