mod pb;
mod store;

use std::sync::Arc;

use tonic::{transport::Server, Request, Response, Status};

use pb::metrics::metrics_service_server::{MetricsService, MetricsServiceServer};
use pb::metrics::{
    GetMetricsRequest, GetMetricsResponse, SubmitMetricsRequest, SubmitMetricsResponse,
};
use pb::test::test_server::{Test, TestServer};
use pb::test::{TestRequest, TestResponse};
use store::MetricsStore;

#[derive(Default)]
struct MyTest;

#[tonic::async_trait]
impl Test for MyTest {
    async fn test_method(
        &self,
        request: Request<TestRequest>,
    ) -> Result<Response<TestResponse>, Status> {
        let r = request.into_inner();
        println!("TestMethod: {:?}", r.test_before);

        let reply = TestResponse {
            test_after: format!("Processed: {}", r.test_before),
        };

        println!("TestMethod: {:?}", reply);

        Ok(Response::new(reply))
    }
}

struct MyMetrics {
    store: Arc<MetricsStore>,
}

#[tonic::async_trait]
impl MetricsService for MyMetrics {
    async fn submit_metrics(
        &self,
        request: Request<SubmitMetricsRequest>,
    ) -> Result<Response<SubmitMetricsResponse>, Status> {
        let batch = request.into_inner().metrics;
        let count = batch.len();
        let accepted = self.store.submit(batch);

        println!("SubmitMetrics: accepted {accepted}/{count}");

        Ok(Response::new(SubmitMetricsResponse {
            accepted_count: accepted,
        }))
    }

    async fn get_metrics(
        &self,
        request: Request<GetMetricsRequest>,
    ) -> Result<Response<GetMetricsResponse>, Status> {
        let req = request.into_inner();
        let metrics = self.store.get(req);
        let returned = metrics.len();

        println!("GetMetrics: returning {returned} samples");

        Ok(Response::new(GetMetricsResponse { metrics }))
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let bind = std::env::var("GRPC_BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:3000".into());
    let addr = bind.parse()?;
    let store = Arc::new(MetricsStore::new());

    let test_service = TestServer::new(MyTest);
    let metrics_service = MetricsServiceServer::new(MyMetrics {
        store: Arc::clone(&store),
    });

    println!("Server listening on {addr}");
    println!("  Test service (POC): Test.TestMethod");
    println!("  Metrics service: MetricsService.SubmitMetrics, GetMetrics");

    Server::builder()
        .add_service(test_service)
        .add_service(metrics_service)
        .serve(addr)
        .await?;

    Ok(())
}
